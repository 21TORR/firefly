2.2.2
=====

* (bug) Don't lint SCSS when no debug is set.


2.2.1
=====

* (improvement) Enable ES2017 in TypeScript.


2.2.0
=====

* (feature) Add support for import aliasing.


2.1.5
=====

*   (improvement) Fix babel warning.


2.1.4
=====

*   (improvement) Don't lint `.json` files with ESLint
*   (improvement) Fix babel warning.


2.1.3
=====

*   (improvement) Don't preserve entry chunks in Rollup.


2.1.2
=====

*   (improvement) Only ever lint JS/TS files.
*   (improvement) Add explicit `peerDependency` to `@babel/core`.


2.1.1
=====

*   (improvement) Only lint actual JS files in ESlint.


2.1.0
=====

*   (internal) Rename `DependenciesMap` to `DependenciesMapWriter`.
*   (feature) Add external `DependenciesMap`.
*   (feature) Add `includeAssets()`.
*   (bug) Bundle as `umd` instead of SystemJS for IE11.


2.0.4
=====

*   (bug) Fix typo in Rollup size reporter.


2.0.3
=====

*   (improvement) Don't fix in the watcher.


2.0.2
=====

*   (bug) Remove debug output.


2.0.1
=====

*   (bug) Properly write `_dependencies.json` if anything changes.
*   (bug) Remove old builds in SCSS watcher.


2.0.0
=====

*   (improvement) Explicitly pass `cwd` to the sass resolver, so that it works even if Firefly is installed via symlink.
*   (improvement) Use explicit `DependencyMap`, to be able to iteratively update the dependency map.
*   (bug) Actually write the output files in the JS watcher.
*   (bc) load SystemJS + promise polyfill for legacy build via plugin instead of a manual implementation and remove the `_base` files.
*   (improvement) Clear the output directory when writing watched JS files.
*   (bc) Changed the storage place of the `_dependencies.json` (it is now in the root of the `output` path).
*   (bc) Changed the structure and keys in the dependencies map, to also allow SCSS files to be written into the dependencies map.
*   (feature) Add option to disable the legacy build.
*   (improvement) Bump dependencies.
*   (feature) Add option to force-enable TypeScript support.
*   (feature) Add possibility to import SVG files as string.
*   (feature) Add file name hashing for CSS files.


1.2.12
======

*   (improvement) Fixed ESLint rules.


1.2.11
======

*   (bug) Fix some invalid Stylelint rules.
*   (improvement) Improve size reporting for JS + CSS.


1.2.10
======

*   (bug) Fixed invalid paths in `_dependencies.json`.


1.2.9
=====

*   (bug) Build IE JS as IIFE instead of SystemJS. 


1.2.8
=====

*   (improvement) Fix deprecation in Rollup.


1.2.7
=====

*   (bug) Correctly use tabs.
*   (improvement) Bump dependencies.


1.2.6
=====

*   (improvement) Make linting more lenient.


1.2.5
=====

*   (improvement) Use recommended ESLint config for TypeScript.


1.2.4
=====

*   (improvement) Allow `@internal` in JSDoc.


1.2.3
=====

*   (improvement) Disable a lot of the JSDoc related ESLint rules.


1.2.2
=====

*   (bug) Support `index` files in `node_modules` imports in SCSS.


1.2.1
=====

*   (bug) Properly mock more of node.js internal components.


1.2.0
=====

*   (feature) Automatically mock some of node.js internal components.


1.1.0
=====

+   (improvement) Use `sass` instead of the deprecated `node-sass`.
*   (bug) Always generate sourcemaps in Rollup.
*   (improvement) Clear output directories before building.
*   (feature) Allow loading JSON files in Rollup.
*   (bug) Avoid type issues in `@rollup/plugin-typescript`.


1.0.2
=====

*   (bug) Removed output clearing for now, as it seems to have some issues.


1.0.1
=====

*   (bug) Fixed invalid package requirements.


1.0.0
=====

Initial release `\o/`
