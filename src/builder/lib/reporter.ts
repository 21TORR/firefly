import {OutputAsset, OutputChunk, RollupOutput} from 'rollup';
import path from 'path';
import {Logger} from '../../lib/Logger';
import {bgYellow, blue, green, red, yellow, Color} from 'kleur';
import {statSync} from "fs-extra";
import prettyBytes from "pretty-bytes";
import {gray} from 'kleur/colors';

interface BundledFile
{
	name: string;
	size: number|null;
	import?: boolean;
}

/**
 * Type guard to check if a given output is a chunk
 * @param output
 */
function isOutputChunk (output: OutputChunk | OutputAsset): output is OutputChunk
{
	return (output as any).code !== undefined;
}


/**
 * Renders a single compiled entry
 */
function renderEntry (entry: BundledFile) : string
{
	const fileName = blue(entry.name);
	let size = gray("?");

	if (null !== entry.size)
	{
		let color = green;

		if (entry.size > 250_000)
		{
			color = red;
		}
		else if (entry.size > 50_000)
		{
			color = yellow;
		}

		size = color(prettyBytes(entry.size));
	}

	return `${fileName} (${size})`;
}


/**
 * Reports the bundle sizes of the given files
 */
export function reportBundleSizes (logger: Logger, files: BundledFile[], headline: Color) : void
{
	const entries: BundledFile[] = [];
	const imports: BundledFile[] = [];
	let lines: string[] = [];

	files.forEach(file =>
	{
		(file.import ? imports : entries).push(file);
	})

	// first report entries
	if (entries.length)
	{
		lines.push(headline(`Entries`));
		lines = lines.concat(entries.map(entry => `  • ${renderEntry(entry)}`));
		lines.push("");
	}

	// then report imports
	if (imports.length)
	{
		lines.push(headline(`Dynamic Imports`));
		lines = lines.concat(imports.map(entry => `  • ${renderEntry(entry)}`));
		lines.push("");
	}

	if (lines.length)
	{
		logger.log("Built files summary:", {
			details: lines.join("\n"),
		});
	}
}


/**
 * Reports the rollup bundle sizes
 */
export function reportRollupBundleSizes (logger: Logger, base: string, output: RollupOutput) : void
{
	const bundled: BundledFile[] = [];

	output.output.forEach(file =>
	{
		if (isOutputChunk(file))
		{
			bundled.push({
				name: file.fileName,
				size: safelyFetchFileSize(path.join(base, file.fileName)),
				import: !file.isEntry,
			});
		}
	});

	reportBundleSizes(logger, bundled, yellow);
}


/**
 * Safely fetches the file size
 */
export function safelyFetchFileSize (filePath: string) : number|null
{
	try
	{
		const stat = statSync(filePath);
		return stat.size;
	}
	catch
	{
		return null;
	}
}
