/**
 * Filters file paths for linting, first filtering out vendors, then filtering
 * out with a custom function.
 */
export function filterLintFilePaths (
	filePaths: string[],
	include: (filePath: string) => boolean
) : string[]
{
	const filteredPaths: Record<string, boolean> = {};

	filePaths.forEach(
		filePath => {
			// never include vendor paths
			if (!/\/(node_modules|vendor)\//.test(filePath) && include(filePath))
			{
				filteredPaths[filePath] = true;
			}
		}
	);

	return Object.keys(filteredPaths);
}
