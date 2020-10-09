import {RollupOptions, rollup, watch, OutputChunk, OutputAsset, RollupOutput, RollupWatcherEvent, InputOption} from "rollup";
import {FireflyTypes} from "../@types/firefly";
import {writeJSONSync, ensureDirSync} from "fs-extra";
import * as path from "path";
import hasha from "hasha";
import {filterLintFilePaths} from '../lib/array-filter';
import {ESLint} from "eslint";
import {Logger} from '../lib/Logger';
import {blue, yellow} from 'kleur/colors';
import {readFileSync} from 'fs-extra';
import {writeFileSync} from 'fs';

export interface JsBuildConfig
{
	configs: RollupOptions[];
	jsBase: string;
	hashFilenames: boolean;
}

interface CompileResult
{
	output: RollupOutput;
	legacy: boolean;
	files: string[];
}


/**
 * Determines whether the given output result is a chunk
 */
function isOutputChunk (output: OutputChunk|OutputAsset): output is OutputChunk
{
	return "chunk" === output.type;
}


/**
 * Writes a base file for modern files
 */
function writeModernBaseFile (basePath: string, hashFileNames: boolean): string
{
	return writeBaseFile(
		[
			// Load Promise  polyfill for `.finally()` support
			require.resolve("promise-polyfill/dist/polyfill.min.js"),
		],
		"modern",
		basePath,
		hashFileNames,
	);
}


/**
 * Writes a legacy base vendor file
 */
function writeLegacyBaseFile (basePath: string, hashFileNames: boolean): string
{
	return writeBaseFile(
		[
			// load the Promise polyfill before the system.js core, as it is using promises
			require.resolve("promise-polyfill/dist/polyfill.min.js"),
			require.resolve("systemjs/dist/s.min.js"),
		],
		"legacy",
		basePath,
		hashFileNames,
	);
}


/**
 * Writes a legacy base vendor file
 */
function writeBaseFile (files: string[], type: string, basePath: string, hashFileNames: boolean): string
{
	const content = files.map(
		file => readFileSync(file).toString().trim(),
	)
		.join("\n");

	const hash = hashFileNames
		? "." + hasha(content, {algorithm: "sha256"}).substr(0, 10)
		: "";

	const relativePath = `${type}/_base${hash}.js`;
	const fullPath = `${basePath}/${relativePath}`;

	ensureDirSync(path.dirname(fullPath));
	writeFileSync(fullPath, content);

	return relativePath;
}


/**
 * Writes the dependencies file
 */
function writeDependencies (
	bundleResults: CompileResult[],
	basePath: string,
	legacyBaseFile: string,
	modernBaseFile: string,
): void
{
	const manifest = {};

	bundleResults.forEach(results =>
	{
		results.output.output.forEach(output =>
		{
			if (!isOutputChunk(output) || !output.isEntry)
			{
				return;
			}

			const type = results.legacy ? "legacy" : "modern";
			const name = output.name;

			if (!manifest[type])
			{
				manifest[type] = {};
			}

			if (!manifest[type][name])
			{
				manifest[type][name] = [
					results.legacy ? legacyBaseFile : modernBaseFile
				];
			}

			manifest[type][name].push(`${type}/${name}/${output.fileName}`);

			writeJSONSync(`${basePath}/_dependencies.json`, manifest);
		});
	});
}

function isEventForModernBuild (event: RollupWatcherEvent & {output: readonly string[]}) : boolean
{
	const firstEntry = event.output[0] || "";
	return -1 === firstEntry.indexOf("legacy");
}

function formatInputFiles (event: RollupWatcherEvent & {input: InputOption}): string
{
	return Object.keys(event.input)
		.map(filePath => blue(path.basename(filePath)))
		.join(", ");
}


/**
 * Runner for running the rollup build
 */
export class JsBuilder
{
	private watcherResolve: (() => void)|undefined;
	private logger: Logger;
	private timers: Record<string, [number, number]|undefined> = {};

	public constructor (
		private runConfig: Readonly<FireflyTypes.RunConfig>,
		private buildConfig: Readonly<JsBuildConfig>|null)
	{
		this.logger = new Logger(yellow("JS"));
	}

	public async run (cwd: string): Promise<boolean|null>
	{
		const buildConfig = this.buildConfig;

		if (!buildConfig)
		{
			return null;
		}

		if (this.runConfig.watch)
		{
			const watcher = watch(buildConfig.configs);
			this.logger.log("Start watching all JS bundles");

			watcher.on("event", async event =>
			{
				if (event.code === "BUNDLE_START" && isEventForModernBuild(event))
				{
					const inputs = formatInputFiles(event);
					this.logger.log(`Start building ${inputs}`);
					this.timers[inputs] = process.hrtime();
					return;
				}

				if (event.code === "BUNDLE_END" && isEventForModernBuild(event))
				{
					const inputs = formatInputFiles(event);
					if (this.timers[inputs])
					{
						this.logger.logWithDuration(`Finished building ${inputs}`, process.hrtime(this.timers[inputs]));
						this.timers[inputs] = undefined;
					}
					else
					{
						this.logger.log(`Finished building ${inputs}`);
					}



					if (this.runConfig.debug)
					{
						await this.lintFiles(event.result.watchFiles, cwd);
					}
				}
			});

			return new Promise<boolean>((resolve) =>
			{
				this.watcherResolve = resolve;
			})
				.then(() => {
					watcher.close();
					return true;
				});
		}

		return Promise.all(buildConfig.configs.map(async config =>
		{
			const bundle = await rollup(config);
			const output = config.output![0];

			return {
				output: await bundle.write(output),
				legacy: "system" === output.format,
				files: bundle.watchFiles,
			};
		}))
			.then(async (bundleResults: CompileResult[]) =>
			{
				writeDependencies(
					bundleResults,
					buildConfig.jsBase,
					writeLegacyBaseFile(buildConfig.jsBase, buildConfig.hashFilenames),
					writeModernBaseFile(buildConfig.jsBase, buildConfig.hashFilenames)
				);
				let isValid = true;

				if (this.runConfig.debug)
				{
					const allFiles = bundleResults.reduce<string[]>((sum, current) => sum.concat(current.files), []);
					isValid = await this.lintFiles(allFiles, cwd);
				}

				return isValid;
			});
	}

	/**
	 * Lints all given files
	 */
	private async lintFiles (filePaths: string[], cwd: string) : Promise<boolean>
	{
		const filesToLint = filterLintFilePaths(
			filePaths,
			(filePath) => filePath.startsWith(cwd)
		);

		if (!filesToLint.length)
		{
			return true;
		}

		const eslint = new ESLint({
			cwd,
			fix: this.runConfig.fix,
			overrideConfigFile: path.join(__dirname, "../../configs/.eslintrc.yaml"),
		});
		const results = await eslint.lintFiles(filesToLint);

		if (this.runConfig.fix)
		{
			await ESLint.outputFixes(results);
		}

		// Output the results
		const formatter = await eslint.loadFormatter("stylish");
		const output = formatter.format(results).trim();

		if ("" !== output)
		{
			this.logger.log("Found linting issues:");

			// output lint results, but replace absolute paths with their relative ones
			console.log(output.replace(`${cwd}/`, ""));
		}

		// return whether all were ok, or if there are any entries that have errors / warnings
		return !results.some(
			entry => 0 < (entry.errorCount + entry.warningCount)
		);
	}

	/**
	 *
	 */
	public stop (): void
	{
		if (this.watcherResolve)
		{
			this.logger.log("Stopped watching all JS bundles");
			this.watcherResolve();
			this.watcherResolve = undefined;
		}
	}
}


