import path from 'path';
import glob from 'glob';
import {copyFileSync, ensureDirSync, existsSync} from 'fs-extra';
import {Logger} from './lib/Logger';
import {blue} from 'kleur';
import {gray, green} from 'kleur/colors';

/**
 * Initializes the project in the given directory
 */
export function runInit (projectDir: string, force: boolean) : void
{
	const basePath = path.join(__dirname, "../init");
	const logger = new Logger(blue("init"));
	const files = glob.sync(`**/*`, {
		cwd: basePath,
		nodir: true,
		absolute: false,
		dot: false,
	});

	const fileLog: Record<string, boolean> = {};

	files.forEach(relativeTargetPath => {
		const sourcePath = path.join(basePath, relativeTargetPath);
		const targetPath = path.join(projectDir, relativeTargetPath);
		const shouldWrite = !existsSync(targetPath) || force;
		fileLog[relativeTargetPath] = shouldWrite;

		if (shouldWrite)
		{
			ensureDirSync(path.dirname(targetPath));
			copyFileSync(sourcePath, targetPath);
		}
	});

	logger.log("Initialized the following files:");
	console.log("");

	for (const filePath in fileLog)
	{
		console.log(`  • ${filePath} (${fileLog[filePath] ? green("updated") : gray("skipped")})`);
	}

	console.log("");
	logger.log("finished");
}
