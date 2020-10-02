import {RollupOptions, rollup, watch, OutputChunk, OutputAsset, RollupOutput, RollupWatcherEvent, InputOption} from "rollup";
import {FireflyTypes} from "../@types/firefly";
import {writeJSONSync, copyFileSync, ensureDirSync} from "fs-extra";
import * as path from "path";
import * as hasha from "hasha";
import {filterLintFilePaths} from '../lib/array-filter';
import {ESLint} from "eslint";
import {Logger} from '../lib/Logger';
import {blue, yellow} from 'kleur/colors';

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
 * Writes the SystemJS integration file
 */
function writeSystemJs (basePath: string, hashFileNames: boolean): string
{
	const vendorPath = require.resolve("systemjs/dist/s.min.js");
	let relativePath = `vendor/systemjs.js`;

	if (hashFileNames)
	{
		const hash = hasha.fromFileSync(vendorPath, {algorithm: "sha256"}).substr(0, 10);
		relativePath = `vendor/systemjs.${hash}.js`;
	}

	const fullPath = `${basePath}/${relativePath}`;

	ensureDirSync(path.dirname(fullPath));
	copyFileSync(vendorPath, fullPath);

	return relativePath;
}


/**
 * Writes the dependencies file
 */
function writeDependencies (
	bundleResults: CompileResult[],
	basePath: string,
	systemJsPath: string,
): void
{
	const manifest = {
		systemjs: systemJsPath,
	};

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
				manifest[type][name] = [];
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

	public async run (): Promise<boolean>
	{
		const buildConfig = this.buildConfig;

		if (!buildConfig)
		{
			return true;
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
						await this.lintFiles(event.result.watchFiles);
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
				const systemJsPath = writeSystemJs(buildConfig.jsBase, buildConfig.hashFilenames);
				writeDependencies(bundleResults, buildConfig.jsBase, systemJsPath);
				let isValid = true;

				if (this.runConfig.debug)
				{
					const allFiles = bundleResults.reduce<string[]>((sum, current) => sum = sum.concat(current.files), []);
					isValid = await this.lintFiles(allFiles);
				}

				return isValid;
			});
	}

	private async lintFiles (filePaths: string[]) : Promise<boolean>
	{
		const filesToLint = filterLintFilePaths(
			filePaths,
			(filePath) => true
		);

		if (!filesToLint.length)
		{
			return true;
		}

		const eslint = new ESLint({
			fix: this.runConfig.fix,
			overrideConfigFile: path.join(__dirname, "../../configs/.eslintrc.yaml"),
		});
		const results = await eslint.lintFiles(filesToLint);

		// if (this.runConfig.fix)
		// {
		// 	await ESLint.outputFixes(results);
		// }

		// Output the results
		const formatter = await eslint.loadFormatter("stylish");
		const output = formatter.format(results).trim();

		if ("" !== output)
		{
			console.log(output);
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


