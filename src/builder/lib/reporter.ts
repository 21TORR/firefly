import {OutputAsset, OutputChunk, RollupOutput} from 'rollup';
import path from 'path';
import {blue, green, red, yellow, Color, gray, magenta} from 'kleur';
import {statSync} from "fs-extra";
import prettyBytes from "pretty-bytes";
import {ScssCompilationResult} from '../scss/ScssCompiler';

interface BundledFile
{
	name: string;
	size?: number|null;
	failed?: boolean;
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
function renderEntry (
	entry: BundledFile,
	maxBundleSizeSmall: number,
	maxBundleSizeMedium: number,
) : string
{
	const fileName = blue(entry.name);
	let size = gray("?");

	if (!entry.failed && null != entry.size)
	{
		let color = green;

		if (entry.size > maxBundleSizeMedium)
		{
			color = red;
		}
		else if (entry.size > maxBundleSizeSmall)
		{
			color = yellow;
		}

		size = color(prettyBytes(entry.size));
	}
	else if (entry.failed)
	{
		size = red("failed");
	}

	return `${fileName} (${size})`;
}


/**
 * Reports the bundle sizes of the given files
 */
export function formatBundleSizes (
	files: BundledFile[],
	headline: Color,
	maxBundleSizeSmall: number,
	maxBundleSizeMedium: number,
	) : string
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
		lines = lines.concat(entries.map(entry => `  • ${renderEntry(entry, maxBundleSizeSmall, maxBundleSizeMedium)}`));
		lines.push("");
	}

	// then report imports
	if (imports.length)
	{
		lines.push(headline(`Dynamic Imports`));
		lines = lines.concat(imports.map(entry => `  • ${renderEntry(entry, maxBundleSizeSmall, maxBundleSizeMedium)}`));
		lines.push("");
	}

	return lines.join("\n");
}

export function formatScssBundleSizes (result: ScssCompilationResult[]) : string
{
	return formatBundleSizes(
		result.map(compilation => {
			return !compilation.error
				? compilation
				: {
					name: compilation.name,
					size: null,
					failed: true,
				};
		}),
		magenta,
		100_000,
		200_000
	)
}


/**
 * Reports the rollup bundle sizes
 */
export function formatRollupBundleSizes (base: string, output: RollupOutput) : string
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

	return formatBundleSizes(bundled, yellow, 150_000, 300_000);
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
