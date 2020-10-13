import {ImporterReturnType} from 'node-sass';
import * as path from 'path';
import {readFile} from 'fs-extra';

export function resolveScssImport (url: string, prev: string, done: (data: ImporterReturnType) => void): void
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
				const resolvedPath = require.resolve(fullImportPath);

				if (".scss" !== path.extname(resolvedPath))
				{
					readFile(resolvedPath, (error, data) => done({file: resolvedPath, contents: data.toString()}));
					return;
				}

				return done({file: resolvedPath});
			}
			catch
			{
				// skip
			}
		}

		done(new Error(`Can't resolve '${url}'`));
		return;
	}

	done({
		file: url,
	});
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
		`_${fileName}.css`,
		`${fileName}.css`,
		fileName,
	]
}
