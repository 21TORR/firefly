import {buildBabelConfig} from '../configs/babel-config';

type Entries = Record<string, string>;
import {JsBuildConfig} from "./builder/JsBuilder";
import {terser} from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import {InputOption, OutputOptions, RollupOptions} from "rollup";
import {FireflyTypes} from "./@types/firefly";
import del from 'rollup-plugin-delete';
import commonjs from "@rollup/plugin-commonjs";
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import {getExcludePattern} from './lib/path-helpers';
import {ScssBuildConfig} from './builder/ScssBuilder';

export class Firefly
{
    private outputPath = "build";
    private jsEntries: InputOption = {};
    private scssEntries: Entries = {};
    private hashFileNames: boolean = true;
    private packages: string[] = [
        "@21torr",
    ];


    /**
     * Adds JavaScript entry files
     *
     * @api
     */
    public js (mapping: Entries) : this
    {
        return this.addEntriesToList(mapping, this.jsEntries, "js");
    }


    /**
     * Adds Scss entries
     *
     * @api
     */
    public scss (mapping: Entries): this
    {
        return this.addEntriesToList(mapping, this.scssEntries, "scss");
    }


    /**
     * Adds the given to the entry list.
     */
    private addEntriesToList (mapping: Entries, list: InputOption, type: string) : this
    {
        for (const name in mapping)
        {
            let source = mapping[name];

            if (!/^[./]/.test(source))
            {
                source = `./${source}`;
            }

            if (list[name] !== undefined)
            {
                throw new Error(`Can't add ${type} entry named '${name}': an entry with this name already exists.`);
            }

            list[name] = source;
        }

        return this;
    }


    /**
     * Sets the output dir, where the files are built to.
     * Is relative to `cwd`.
     *
     * @api
     */
    public outputTo (path: string) : this
    {
        this.outputPath = path;
        return this;
    }


    /**
     * Explicitly lists all npm packages that should be compiled.
     *
     * @api
     */
    public compilePackage (...packages: string[]) : this
    {
        this.packages = this.packages.concat(packages);
        return this;
    }


    /**
     * Disables chunk hashes in file names
     *
     * @api
     */
    public disableFileNameHashing (): this
    {
        this.hashFileNames = false;
        return this;
    }

    /**
     * Returns the js build config
     *
     * @internal
     */
    public generateJsBuildConfig (runConfig: FireflyTypes.RunConfig) : JsBuildConfig|null
    {
        if (!Object.keys(this.jsEntries).length)
        {
            return null;
        }

        return {
            configs: [
                this.generateSingleJsBuildConfig(runConfig, true),
                this.generateSingleJsBuildConfig(runConfig, false),
            ],
            jsBase: `${this.outputPath}/js`,
            hashFilenames: this.hashFileNames,
        };
    }

    /**
     *
     */
    private generateSingleJsBuildConfig (runConfig: FireflyTypes.RunConfig, isModern: boolean) : RollupOptions
    {
        const output: OutputOptions = {
            entryFileNames: this.hashFileNames
                ? "[name].[hash].js"
                : "[name].js",
            compact: true,
            plugins: [],
            sourcemap: runConfig.debug,
            globals: {
                jquery: 'jQuery',
                jquery_: '$',
            },
        };

        if (!runConfig.debug)
        {
            output.plugins!.push(terser());
        }

        const extensions = [".tsx", ".ts", ".mjsx", ".mjs", ".jsx", ".js"];

        return {
            input: this.jsEntries,
            external: [
                "jquery",
            ],
            plugins: [
                del({
                    targets: [
                        `${this.outputPath}/js`,
                    ],
                }),
                replace({
                    __DEBUG__: JSON.stringify(runConfig.debug),
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                }),
                resolve({extensions}),
                commonjs(),
                typescript({
                    allowSyntheticDefaultImports: true,
                    alwaysStrict: false,
                    esModuleInterop: true,
                    experimentalDecorators: true,
                    jsx: "react",
                    jsxFactory: "h",
                    jsxFragmentFactory: "Fragment",
                    lib: [
                        "dom",
                        "es5",
                        "es2015",
                        "es2016"
                    ],
                    module: "esnext",
                    moduleResolution: "node",
                    target: "esnext",
                }),
                babel({
                    extensions,
                    exclude: getExcludePattern(this.packages),
                    babelHelpers: 'bundled',
                    ...buildBabelConfig(isModern),
                }),
            ],
            output: [
                {
                    ...output,
                    dir: `${this.outputPath}/js/${isModern ? "modern" : "legacy"}`,
                    format: isModern ? "es" : "system",
                },
            ],
        };
    }


    /**
     * @internal
     */
    public generateScssBuildConfig (runConfig: FireflyTypes.RunConfig) : ScssBuildConfig|null
    {
        if (!Object.keys(this.jsEntries).length)
        {
            return null;
        }

        return {
            entries: this.scssEntries,
            output: `${this.outputPath}/css`,
            base: process.cwd(),
        };
    }
}