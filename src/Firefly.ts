import {buildBabelConfig} from '../configs/babel-config';
import {JsBuildConfig} from "./builder/JsBuilder";
import {terser} from 'rollup-plugin-terser';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {OutputOptions, RollupOptions} from "rollup";
import {FireflyTypes} from "./@types/firefly";
import commonjs from "@rollup/plugin-commonjs";
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
// @todo properly import here, as soon as type errors are fixed
// @ts-ignore ignore TS here for now, as they have type issues
const typescript = require('@rollup/plugin-typescript');
import builtins from 'rollup-plugin-node-builtins';
import nodeGlobals from 'rollup-plugin-node-globals';
import {getExcludePattern} from './lib/path-helpers';
import {ScssBuildConfig} from './builder/ScssBuilder';
import externalGlobals from "rollup-plugin-external-globals";
import json from '@rollup/plugin-json';
import * as path from 'path';
import {DependenciesMap} from './builder/DependenciesMap';
import systemJSLoader from 'rollup-plugin-systemjs-loader';
import svg from 'rollup-plugin-svg';

type Entries = Record<string, string>;

export class Firefly
{
    private dependenciesMap: DependenciesMap;
    private outputPath = "build";
    private jsEntries: Entries = {};
    private scssEntries: Entries = {};
    private hashFileNames: boolean = true;
    private buildLegacy: boolean = true;
    private typeScriptForced: boolean = false;
    private externals: Entries = {
        "jquery": "window.jQuery",
    };
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
        return this.addEntriesToList(
            mapping,
            this.jsEntries,
            "js",
            ["_base"],
        );
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
    private addEntriesToList (mapping: Entries, list: Entries, type: string, reservedNames: string[] = []) : this
    {
        for (const name in mapping)
        {
            let source = mapping[name];

            if (reservedNames.includes(name))
            {
                throw new Error(`Can't use name '${name}', as it is a reserved name.`);
            }

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
     * Sets externals
     *
     * @api
     */
    public withExternals (externals: Record<string, string>) : this
    {
        this.externals = {...this.externals, ...externals};

        return this;
    }


    /**
     * Explicitly lists all npm packages that should be compiled.
     *
     * @api
     */
    public compilePackages (...packages: string[]) : this
    {
        this.packages = this.packages.concat(packages);
        return this;
    }

    /**
     * Forces TypeScript compilation.
     * Normally TypeScript is automatically activated, if at least one of your entry files is a TypeScript file.
     *
     * However, if only one of the imported files is TypeScript, this won't work. Then you need to enable this option.
     *
     * @api
     */
    public forceEnableTypeScript () : this
    {
        this.typeScriptForced = true;
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
     * Disables the legacy build
     *
     * @api
     */
    public disableLegacyBuild () : this
    {
        this.buildLegacy = false;
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

        const configs = [
            this.generateSingleJsBuildConfig(runConfig, true),
        ];

        if (this.buildLegacy)
        {
            configs.push(this.generateSingleJsBuildConfig(runConfig, false));
        }

        return {
            configs,
            jsBase: `${this.outputPath}/js`,
            dependenciesMap: this.getDependenciesMap(),
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
            sourcemap: true,
            globals: {
                jquery: 'jQuery',
                jquery_: '$',
            },
        };

        if (!runConfig.debug)
        {
            output.plugins!.push(terser());
        }

        const extensions = [".tsx", ".ts", ".mjsx", ".mjs", ".jsx", ".js", ".json"];

        return {
            input: this.jsEntries,
            external: [
                "jquery",
            ],
            plugins: [
                replace({
                    preventAssignment: true,
                    values: {
                        __DEBUG__: JSON.stringify(runConfig.debug),
                        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                    },
                }),
                nodeResolve({extensions}),
                commonjs({
                    sourceMap: true,
                }),
                externalGlobals(this.externals),
                builtins(),
                nodeGlobals(),
                json(),
                svg({
                    base64: false,
                }),
                this.hasTypeScriptEntry() ? typescript({
                    allowSyntheticDefaultImports: true,
                    alwaysStrict: false,
                    declaration: false,
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
                    sourceMap: true,
                    target: "esnext",
                    typescript: require("typescript"),
                }) : undefined,
                babel({
                    extensions,
                    exclude: getExcludePattern(this.packages),
                    babelHelpers: 'bundled',
                    sourceMaps: true,
                    ...buildBabelConfig(isModern),
                }),
                !isModern ? systemJSLoader({
                    include: [
                        require.resolve("promise-polyfill/dist/polyfill.min.js"),
                        require.resolve('systemjs/dist/s.js'),
                    ],
                }) : undefined,
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
     * Checks whether there is a TypeScript entry file
     */
    private hasTypeScriptEntry () : boolean
    {
        if (this.typeScriptForced)
        {
            return true;
        }

        return Object.values(this.jsEntries)
            .some(filePath => /^\.tsx?$/.test(path.extname(filePath)));
    }


    /**
     * @internal
     */
    public generateScssBuildConfig (runConfig: FireflyTypes.RunConfig) : ScssBuildConfig|null
    {
        if (!Object.keys(this.scssEntries).length)
        {
            return null;
        }

        return {
            entries: this.scssEntries,
            output: `${this.outputPath}/css`,
            base: process.cwd(),
            dependenciesMap: this.getDependenciesMap(),
        };
    }


    /**
     * Returns the dependencies map for this compilation
     */
    private getDependenciesMap () : DependenciesMap
    {
        if (!this.dependenciesMap)
        {
            this.dependenciesMap = new DependenciesMap(this.outputPath);
        }

        return this.dependenciesMap;
    }


    /**
     * Marks the start for the internal compilation
     * @internal
     */
    public startInternalCompilation () : void
    {
        this.getDependenciesMap().reset();
    }
}
