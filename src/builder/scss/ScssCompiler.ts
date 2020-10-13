import sass, {Result} from "node-sass";
import postcss, {AcceptedPlugin, Result as PostCSSResult} from "postcss";
import autoprefixer from "autoprefixer";
import postCssReporter from "postcss-reporter";
import Processor from 'postcss/lib/processor';
import {blue, red} from 'kleur';
import {Logger} from '../../lib/Logger';
import path from 'path';
import {ensureDir, remove, writeFile} from 'fs-extra';
import csso from "postcss-csso";

export interface ScssCompilationResult
{
	includedFiles: string[];
	size: number;
	name: string;
}


export class ScssCompiler
{
	private readonly postProcessor: Processor;
	private readonly basename: string;
	private readonly outPath: string;

	/**
	 */
	constructor (
		private readonly logger: Logger,
		private base: string,
		private debug: boolean,
		private outDir: string,
		name: string,
		private filePath: string,
	)
	{
		this.basename = path.basename(filePath);
		this.outPath = path.join(this.outDir, `${name}.css`);

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
	async build () : Promise<ScssCompilationResult>
	{
		// remove output dir
		await remove(this.outDir);

		// build SCSS
		const nodeSassResult: Result = await this.runNodeSass();
		const compiledFiles = nodeSassResult.stats.includedFiles;

		// run postcss
		const postProcessed = await this.postProcess(nodeSassResult);

		// write files
		await this.writeFiles(postProcessed.css, postProcessed.map.toString());

		return {
			includedFiles: compiledFiles,
			name: this.basename,
			size: postProcessed.css.length,
		};
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
}
