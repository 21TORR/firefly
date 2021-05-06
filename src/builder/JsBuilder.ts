import {RollupOptions, rollup, watch, OutputChunk, OutputAsset, RollupOutput, RollupWatcherEvent, InputOption, RollupWatcher} from "rollup";
import {FireflyTypes} from "../@types/firefly";
import {remove, removeSync} from "fs-extra";
import * as path from "path";
import {filterLintFilePaths} from '../lib/array-filter';
import {ESLint} from "eslint";
import {Logger} from '../lib/Logger';
import {blue, yellow, cyan} from 'kleur';
import {formatRollupBundleSizes} from './lib/reporter';
import {DependenciesMapWriter} from './DependenciesMapWriter';
import {ALLOWED_JS_FILE_TYPES} from '../Firefly';

export interface JsBuildConfig
{
	configs: RollupOptions[];
	jsBase: string;
	dependenciesMap: DependenciesMapWriter;
}

interface CompileResult
{
	inputs: string;
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
 * Writes the dependencies file
 */
function writeDependencies (
	dependenciesMap: DependenciesMapWriter,
	bundleResults: CompileResult[]
): void
{
	bundleResults.forEach(results =>
	{
		results.output.output.forEach(output =>
		{
			if (!isOutputChunk(output) || !output.isEntry)
			{
				return;
			}

			const type = results.legacy ? "legacy" : "modern";

			dependenciesMap.set(
				`js/${output.name}.js`,
				[
					`js/${type}/${output.fileName}`
				],
				type
			);
		});
	});
}

function isEventForModernBuild (event: RollupWatcherEvent & {output: readonly string[]}) : boolean
{
	const firstEntry = event.output[0] || "";
	return -1 === firstEntry.indexOf("legacy");
}

function formatInputFiles (input?: InputOption): string
{
	if (!input)
	{
		return "";
	}

	return Object.keys(input)
		.map(filePath => blue(path.basename(filePath)))
		.join(", ");
}


/**
 * Runner for running the rollup build
 */
export class JsBuilder
{
	private watcherResolve: ((value: boolean) => void)|undefined;
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

		// clear output dir
		this.logger.log(`Removing the output dir at ${yellow(buildConfig.jsBase)}`);
		await remove(path.join(cwd, buildConfig.jsBase));

		if (this.runConfig.watch)
		{
			this.logger.log("Start watching all JS bundles");
			const watchers: RollupWatcher[] = buildConfig.configs.map(
				config =>
				{
					const watcher = watch(config);

					watcher.on("event", async event =>
					{
						if (event.code === "BUNDLE_START" && isEventForModernBuild(event))
						{
							const inputs = formatInputFiles(event.input);
							this.logger.log(`Start building ${inputs}`);
							this.timers[inputs] = process.hrtime();
							return;
						}

						if (event.code === "BUNDLE_END")
						{
							const output = config.output![0];
							const isLegacy = "es" !== output.format;

							// clear output directory (as we will rewrite all files)
							removeSync(output.dir);

							// write output
							const result = await event.result.write(output);
							const inputs = formatInputFiles(event.input);

							const bundleResults = [{
								inputs,
								output: result,
								legacy: isLegacy,
								files: event.result.watchFiles,
							}];

							await this.onBundleWriteFinished(
								bundleResults,
								buildConfig,
								event.result.watchFiles,
								cwd
							);

							this.logger.log(`Finished writing ${cyan(isLegacy ? "legacy" : "modern")} for files ${inputs}`);
						}

						if ((event as any).result)
						{
							(event as any).result.close();
						}
					});

					return watcher;
				}
			);


			return new Promise<boolean>((resolve) =>
			{
				this.watcherResolve = resolve;
			})
				.then(() => {
					watchers.forEach(watcher => watcher.close());
					return true;
				});
		}

		return Promise.all(buildConfig.configs.map(async config =>
		{
			const output = config.output![0];
			const legacy = "es" !== output.format;
			const inputs = formatInputFiles(config.input as InputOption);

			if (!legacy)
			{
				this.logger.log(`Start building ${inputs}`);
				this.timers[inputs] = process.hrtime();
			}

			const bundle = await rollup(config);

			return {
				inputs,
				output: await bundle.write(output),
				legacy: legacy,
				files: bundle.watchFiles,
			};
		}))
			.then(async (bundleResults: CompileResult[]) =>
			{
				return this.onBundleWriteFinished(
					bundleResults,
					buildConfig,
					bundleResults.reduce<string[]>((sum, current) => sum.concat(current.files), []),
					cwd
				);
			});
	}


	/**
	 * Callback, that reports on the finished bundle write
	 */
	private async onBundleWriteFinished (
		bundleResults: CompileResult[],
		buildConfig: Readonly<JsBuildConfig>,
		filesToLint: string[],
		cwd: string
	) : Promise<boolean>
	{
		bundleResults.forEach(results =>
		{
			if (!results.legacy)
			{
				this.logger.log(`Finished building ${results.inputs}`, {
					duration: process.hrtime(this.timers[results.inputs]),
					details: formatRollupBundleSizes(path.join(cwd, buildConfig.jsBase, "modern"), results.output),
				});
			}
		});

		writeDependencies(buildConfig.dependenciesMap, bundleResults);

		return this.runConfig.debug
			? await this.lintFiles(filesToLint, cwd)
			: true;
	}


	/**
	 * Lints all given files
	 */
	private async lintFiles (filePaths: string[], cwd: string) : Promise<boolean>
	{
		const filesToLint = filterLintFilePaths(
			filePaths,
			(filePath) => filePath.startsWith(cwd) && ALLOWED_JS_FILE_TYPES.includes(path.extname(filePath))
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
		const output = formatter.format(results);

		if ("" !== output)
		{
			this.logger.log("Found linting issues:", {
				// output lint results, but replace absolute paths with their relative ones
				details: output.replace(`${cwd}/`, ""),
				detailsPadding: false,
			});
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
			this.watcherResolve(true);
			this.watcherResolve = undefined;
		}
	}
}


