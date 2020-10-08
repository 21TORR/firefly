import path from "path";
import execa from "execa";
import {copySync, removeSync} from "fs-extra";

/**
 * Runs a single fixture and executes the callback with the result
 */
export async function runFixture (
	fixtureName,
	callback
)
{
	const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);

	// copy test files to temp directory
	const buildPath = `${fixturePath}-build`;
	copySync(fixturePath, buildPath);

	const result = await execa(
		path.join(__dirname, "../../bin/cli.js"),
		["ci"],
		{
			cwd: buildPath,
			reject: false,
		}
	);

	callback(result, buildPath);

	// clean up temp directory
	removeSync(buildPath);
}
