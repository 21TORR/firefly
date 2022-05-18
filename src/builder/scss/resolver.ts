import {LegacyImporterResult} from 'sass';
import * as path from 'path';
import {readFileSync} from 'fs-extra';

export function resolveScssImport (cwd: string, url: string, prev: string): LegacyImporterResult
{
	if ("~" === url[0])
	{
		const rawUrl = url.substr(1);
		const possibleFileNames = generatePossibleNames(path.basename(rawUrl));

		for (let i = 0; i < possibleFileNames.length; i++)
		{
			const fullImportPath = `${path.dirname(rawUrl)}/${possibleFileNames[i]}`;

			try
			{
				const resolvedPath = require.resolve(fullImportPath, {
					paths: [cwd],
				});

				if (".scss" !== path.extname(resolvedPath))
				{
					return {
						file: resolvedPath,
						contents: readFileSync(resolvedPath).toString(),
					};
				}

				return {file: resolvedPath};
			}
			catch
			{
				// skip
			}
		}

		return new Error(`Can't resolve '${url}'`);
	}

	return {
		file: url,
	};
}

/**
 * Generates a list of possible file names for the given base name
 */
function generatePossibleNames (fileName: string) : string[]
{
	const extension = path.extname(fileName);

	if (".css" === extension || ".scss" === extension)
	{
		return [
			fileName,
			`_${fileName}`,
		];
	}

	return [
		`_${fileName}.scss`,
		`${fileName}.scss`,
		`${fileName}/_index.scss`,
		`${fileName}/index.scss`,
		`_${fileName}.css`,
		`${fileName}.css`,
		fileName,
	]
}
