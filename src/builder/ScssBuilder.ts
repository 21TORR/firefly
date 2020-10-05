import {FireflyTypes} from '../@types/firefly';
import path from 'path';
import {ScssCompiler} from './scss/ScssCompiler';

export interface ScssBuildConfig
{
    entries: Record<string, string>;
    output: string;
    base: string;
}

export class ScssBuilder
{
    private compilers: ScssCompiler[];

    /**
     */
    public constructor (
        private runConfig: Readonly<FireflyTypes.RunConfig>,
        private buildConfig: Readonly<ScssBuildConfig>|null
    )
    {
        this.compilers = [];
    }

    /**
     *
     */
    public async run () : Promise<boolean|null>
    {
        if (!this.buildConfig || !Object.keys(this.buildConfig.entries).length || (this.compilers.length && this.runConfig.watch))
        {
            return null;
        }

        const compilers: ScssCompiler[] = [];

        for (const name in this.buildConfig.entries)
        {
            const filePath = path.join(this.buildConfig.base, this.buildConfig.entries[name]);

            compilers.push(new ScssCompiler(
                this.buildConfig.base,
                this.runConfig.debug,
                this.runConfig.fix,
                this.buildConfig.output,
                name,
                filePath
            ));
        }

        if (this.runConfig.watch)
        {
            compilers.forEach(compiler => compiler.watch());
            this.compilers = compilers;
            return true;
        }

        // run build for every compiler and wait for the stop
        return Promise.all(
            compilers.map(compiler => compiler.build())
        )
            .then(results => results.includes(false));
    }


    /**
     * Stops any watcher, if there are any.
     */
    public stop () : void
    {
        if (this.compilers.length)
        {
            this.compilers.forEach(async compiler => await compiler.stop());
            this.compilers = [];
        }
    }
}
