import {writeJSONSync, ensureDirSync, removeSync} from "fs-extra";
import {join} from "path";

export class DependenciesMap
{
	private filePath: string;
	private dependencies = {};

	/**
	 *
	 */
	public constructor (private basePath: string)
	{
		this.filePath = join(basePath, "_dependencies.json");
	}

	/**
	 * Resets the dependencies file
	 */
	public reset () : void
	{
		removeSync(this.filePath);
		this.dependencies = {};
	}

	/**
	 * Sets the dependency
	 */
	public set (file: string, dependencies: string[], type?: string) : void
	{
		if (
			(type && Array.isArray(this.dependencies[file]))
			|| (!type && !Array.isArray(this.dependencies[file]))
		)
		{
			throw new Error("Can't merge typed & untyped dependencies");
		}

		if (!type)
		{
			this.dependencies[file] = dependencies;
			return;
		}

		if (!this.dependencies[file])
		{
			this.dependencies[file] = {};
		}

		this.dependencies[file][type] = dependencies;
		ensureDirSync(this.basePath);
		writeJSONSync(this.filePath, this.dependencies, {
			spaces: '\t',
		});
	}
}
