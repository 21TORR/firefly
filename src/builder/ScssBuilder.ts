import {FireflyTypes} from '../@types/firefly';
import path from 'path';
import {ScssCompilationResult, ScssCompiler} from './scss/ScssCompiler';
import chokidar, {FSWatcher} from "chokidar";
import {blue, magenta, yellow} from 'kleur';
import {Logger} from '../lib/Logger';
import {lint} from "stylelint";
import {filterLintFilePaths} from '../lib/array-filter';
import {formatScssBundleSizes} from './lib/reporter';
import {remove} from 'fs-extra';


export interface ScssBuildConfig
{
    entries: Record<string, string>;
    output: string;
    base: string;
}


export class ScssBuilder
{
    private readonly compilers: Record<string, ScssCompiler> = {};

    /**
     * Map of all the last compilation results
     */
    private lastCompilationResults: Record<string, ScssCompilationResult> = {};

    private watcher: FSWatcher|undefined;
    private readonly logger: Logger;
    private readonly stylelintConfigFile: string;
    private watcherResolve: (() => void)|undefined;
    private readonly outputPath?: string;

    /**
     */
    public constructor (
        private runConfig: Readonly<FireflyTypes.RunConfig>,
        private buildConfig: Readonly<ScssBuildConfig>|null
    )
    {
        this.compilers = {};
        this.logger = new Logger(magenta("SCSS"));
        this.stylelintConfigFile = path.join(__dirname, "../../configs/.stylelintrc.yml")

        if (buildConfig)
        {
            this.outputPath = buildConfig.output;

            for (const name in buildConfig.entries)
            {
                const filePath = path.join(buildConfig.base, buildConfig.entries[name]);
                this.compilers[name] = new ScssCompiler(
                    this.logger,
                    buildConfig.base,
                    runConfig.debug,
                    buildConfig.output,
                    name,
                    filePath,
                );
            }
        }
    }

    /**
     *
     */
    public async run () : Promise<boolean|null>
    {
        if (!Object.keys(this.compilers).length || !this.outputPath)
        {
            return null;
        }

        // clear output dir
        this.logger.log(`Removing the output dir at ${yellow(this.outputPath)}`);
        await remove(this.outputPath);

        // start by first compiling all
        await this.compileEntries(Object.keys(this.compilers));
        const allIncludedFiles = this.fetchAllIncludedFiles();

        // then linting all
        const hasLintErrors = await this.lintFiles(allIncludedFiles);

        if (this.runConfig.watch)
        {
            this.logger.log(`Started watching`);
            this.watcher = chokidar.watch(allIncludedFiles, {
                ignoreInitial: true,
            });

            this.watcher
                .on("add", (changedFile: string) => this.onChangedFile(changedFile))
                .on("change", (changedFile: string) => this.onChangedFile(changedFile))
                .on("unlink", (changedFile: string) => this.onChangedFile(changedFile));

            return new Promise(resolve => {
                this.watcherResolve = resolve;
            })
                .then(async () => {
                    if (this.watcher)
                    {
                        await this.watcher.close();
                        this.watcher = undefined;
                    }

                    return true;
                });
        }

        return !hasLintErrors;
    }


    /**
     * Fetches a list of all included files
     */
    private fetchAllIncludedFiles () : string[]
    {
        const includes = {};

        for (const entry in this.lastCompilationResults)
        {
            this.lastCompilationResults[entry].includedFiles.forEach(
                file => includes[file] = true
            );
        }

        return Object.keys(includes);
    }


    /**
     * Compiles the given entries
     */
    private async compileEntries (entries: string[]) : Promise<void>
    {
        const start = process.hrtime();
        const names = entries.map(blue).join(", ");

        this.logger.log(`Start building ${names}`);

        const compilations = await Promise.all(
            entries.map(async entry => {
                return {
                    entry,
                    result: await this.compilers[entry].build()
                }
            })
        );

        const results = compilations.map(result =>
        {
            this.lastCompilationResults[result.entry] = result.result;
            return result.result;
        });

        // reports the built files
        this.logger.log(`Finished building ${names}`, {
            duration: process.hrtime(start),
            details: formatScssBundleSizes(results),
        });
    }

    /**
     * Callback on when a file changed
     */
    private async onChangedFile (changedFile: string): Promise<void>
    {
        const watchedFilesBefore = this.fetchAllIncludedFiles();
        const entriesToCompile: string[] = [];

        for (const entry in this.lastCompilationResults)
        {
            if (this.lastCompilationResults[entry].includedFiles.includes(changedFile))
            {
                entriesToCompile.push(entry);
            }
        }

        // compile all entries that needs compilation
        await this.compileEntries(entriesToCompile);

        // lints the changed file
        await this.lintFiles([changedFile]);

        // update watcher
        this.watcher!.unwatch(watchedFilesBefore);
        this.watcher!.add(this.fetchAllIncludedFiles());
    }


    /**
     * Lints the given files
     *
     * @return if the build error
     */
    private async lintFiles (filePaths: string[]) : Promise<boolean>
    {
        const filesToLint = filterLintFilePaths(
            filePaths,
            (filePath) => "~" !== filePath[0] && filePath.startsWith(this.buildConfig!.base)
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
            fix: this.runConfig.fix,
        });

        const output = results.output.trim();

        if ("" !== output)
        {
            this.logger.log("Found linting issues:", {details: output});
        }

        return results.errored;
    }


    /**
     * Stops any watcher, if there are any.
     */
    public stop () : void
    {
        if (this.watcherResolve)
        {
            this.logger.log(`Stopped watching`);
            this.watcherResolve();
            this.watcherResolve = undefined;
            this.lastCompilationResults = {};
        }
    }
}
