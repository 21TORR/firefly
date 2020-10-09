import sass, {Result} from "node-sass";
import postcss, {AcceptedPlugin, Result as PostCSSResult} from "postcss";
import autoprefixer from "autoprefixer";
import postCssReporter from "postcss-reporter";
import Processor from 'postcss/lib/processor';
import {blue, magenta, red} from 'kleur/colors';
import {Logger} from '../../lib/Logger';
import path from 'path';
import {ensureDir, remove, writeFile} from 'fs-extra';
import csso from "postcss-csso";
import chokidar, {FSWatcher} from "chokidar";
import {lint} from "stylelint";
import {filterLintFilePaths} from '../../lib/array-filter';


export class ScssCompiler
{
	private postProcessor: Processor;
	private logger: Logger;
	private basename: string;
	private outPath: string;
	private watcher: FSWatcher|undefined;
	private lastCompiledFiles: string[] = [];
	private stylelintConfigFile: string;

	/**
	 */
	constructor (
		private base: string,
		private debug: boolean,
		private fix: boolean,
		private outDir: string,
		name: string,
		private filePath: string
	)
	{
		this.basename = path.basename(filePath);
		this.outPath = path.join(this.outDir, `${name}.css`);
		this.logger = new Logger(magenta("SCSS"));
		this.stylelintConfigFile = path.join(__dirname, "../../../configs/.stylelintrc.yml")

		const plugins: AcceptedPlugin[] = [
			autoprefixer({
				grid: "no-autoplace",
			}),
			postCssReporter({
				clearReportedMessages: true,
			}),
		];

		if (!this.debug)
		{
			plugins.push(csso());
		}

		this.postProcessor = postcss(plugins);
	}

	/**
	 * Builds the file once
	 */
	async build () : Promise<boolean>
	{
		const includedFiles = await this.run();

		if (this.debug)
		{
			return await this.lintFiles(includedFiles);
		}

		return true;
	}


	/**
	 * Runs the build and returns the compiler result
	 *
	 * @return Returns the included files
	 */
	async run () : Promise<string[]>
	{
		const start = process.hrtime();
		this.logger.log(`Start building ${blue(this.basename)}`);

		// remove output dir
		await remove(this.outDir);

		// build SCSS
		const nodeSassResult: Result = await this.runNodeSass();
		const compiledFiles = nodeSassResult.stats.includedFiles;

		// run postcss
		const postProcessed = await this.postProcess(nodeSassResult);

		// write files
		await this.writeFiles(postProcessed.css, postProcessed.map.toString());

		this.logger.logWithDuration(`Finished building ${blue(this.basename)}`, process.hrtime(start));

		return compiledFiles;
	}

	/**
	 * Starts a watcher for the given file
	 */
	async watch () : Promise<void>
	{
		if (this.watcher)
		{
			return;
		}

		const includedFiles = await this.run();
		this.watcher = chokidar.watch(includedFiles, {
			ignoreInitial: true,
		});

		this.logger.log(`Start watching ${blue(this.basename)}`);
		this.lastCompiledFiles = includedFiles;

		this.watcher
			.on("add", (changedFile: string) => this.onChangedFile(changedFile))
			.on("change", (changedFile: string) => this.onChangedFile(changedFile))
			.on("unlink", (changedFile: string) => this.onChangedFile(changedFile));
	}

	/**
	 * Callback on when a file changed
	 */
	private async onChangedFile (changedFile: string) : Promise<void>
	{
		if (!this.watcher)
		{
			return;
		}

		// stop watcher
		this.watcher.unwatch(this.lastCompiledFiles);

		// only lint the given file
		await this.lintFiles([changedFile]);

		// run compilation + update watched files
		this.lastCompiledFiles = await this.run();
		this.watcher.add(this.lastCompiledFiles);
	}

	/**
	 * Lints the given files
	 */
	private async lintFiles (filePaths: string[]) : Promise<boolean>
	{
		const filesToLint = filterLintFilePaths(
			filePaths,
			(filePath) => "~" !== filePath[0] && filePath.startsWith(this.base)
		);

		if (!filesToLint.length)
		{
			return true;
		}

		const results = await lint({
			configFile: this.stylelintConfigFile,
			files: filesToLint,
			formatter: "string",
			cache: true,
			fix: this.fix,
		});

		const output = results.output.trim();

		if ("" !== output)
		{
			this.logger.log("Found linting issues:");
			console.log("");
			console.log(output);
			console.log("");
		}

		return results.errored;
	}


	/**
	 * Runs node sass on the file
	 */
	private async runNodeSass () : Promise<Result>
	{
		return await new Promise((resolve, reject) => {
			sass.render(
				{
					file: this.filePath,
					outFile: this.outPath,
					outputStyle: 'expanded',
					sourceMap: true,
					includePaths: [this.base],
					sourceComments: this.debug,
				},
				(err, result) => {
					if (err)
					{
						return reject(err);
					}

					return resolve(result);
				}
			);
		});
	}


	/**
	 * Post processes the node-sass compiled CSS
	 */
	private async postProcess (css: Result) : Promise<PostCSSResult>
	{
		try
		{
			return await this.postProcessor.process(css.css, {
				from: this.filePath,
				to: this.outPath,
				map: {
					annotation: this.debug,
					inline: false,
					prev: css.map.toString(),
				},
			});
		}
		catch (error)
		{
			this.logger.log(`${red("PostCSS Error")} in file ${blue(this.basename)}: ${error.message}`);
			throw error;
		}
	}


	/**
	 * Writes the file to disk
	 */
	private async writeFiles (css: string, sourceMap: string) : Promise<unknown>
	{
		await ensureDir(this.outDir);
		return Promise.all([
			writeFile(this.outPath, css),
			writeFile(this.outPath + ".map", sourceMap),
		]);
	}


	/**
	 * Stops a watcher (if one is active)
	 */
	public async stop () : Promise<void>
	{
		if (this.watcher)
		{
			this.logger.log(`Stopped watching ${blue(this.basename)}`);
			await this.watcher.close();
			this.watcher = undefined;
			this.lastCompiledFiles = [];
		}
	}
}
