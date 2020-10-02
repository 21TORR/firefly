import {RollupBabelInputPluginOptions} from '@rollup/plugin-babel';
import {BROWSERSLIST_LEGACY, BROWSERSLIST_MODERN} from './browserslist';


export function buildBabelConfig (isModern: boolean) : Pick<RollupBabelInputPluginOptions, 'presets'|'plugins'>
{
	return {
		presets: [
			[require("@babel/preset-react"), {
				pragma: "h",
				pragmaFrag: "Fragment",
			}],
			[require("@babel/preset-env"), {
				spec: false,
				useBuiltIns: "usage",
				corejs: 3,
				targets: isModern ? BROWSERSLIST_MODERN: BROWSERSLIST_LEGACY,
			}],
		],
		plugins: [
			// ------------------------------------------------------------------------------------------
			// Stage 3 proposals
			// ------------------------------------------------------------------------------------------
			[require("@babel/plugin-proposal-json-strings")],
			[require("@babel/plugin-proposal-nullish-coalescing-operator"), {loose: true}],
			[require("@babel/plugin-proposal-numeric-separator")],
			[require("@babel/plugin-syntax-dynamic-import")],

			// set with loose: true, as the compilation is pretty big otherwise
			// https://babeljs.io/docs/plugins/transform-class-properties/
			[require("@babel/plugin-proposal-class-properties"), {loose: true}],
		],
	};
}
