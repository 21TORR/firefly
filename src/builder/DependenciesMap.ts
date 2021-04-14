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
		// if there is already a
		if (!this.isValidEntry(file, type))
		{
			throw new Error("Can't merge typed & untyped dependencies");
		}

		if (!type)
		{
			this.dependencies[file] = dependencies;
		}
		else
		{
			if (!this.dependencies[file])
			{
				this.dependencies[file] = {};
			}

			this.dependencies[file][type] = dependencies;
		}

		ensureDirSync(this.basePath);
		writeJSONSync(this.filePath, this.dependencies, {
			spaces: '\t',
		});
	}

	/**
	 * Returns, whether the given file/type combination is valid
	 */
	private isValidEntry (file: string, type?: string) : boolean
	{
		// if there is no entry yet, everything is valid
		if (!this.dependencies[file])
		{
			return true;
		}

		const hasType = !!type;
		const shouldHaveType = !Array.isArray(this.dependencies[file]);

		return hasType === shouldHaveType;
	}
}
