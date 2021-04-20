import {readJsonSync} from 'fs-extra';
import {AttributeValue, HtmlElement} from './asset/HtmlElement';
import * as path from 'path';

type SimpleDependencies = string[];
interface NestedDependencies {
	modern: string[];
	legacy?: string[];
}
type Dependencies = SimpleDependencies | NestedDependencies;


/**
 * Checks whether the given dependencies are simple dependencies
 */
function areSimpleDependencies (dependencies: Dependencies) : dependencies is SimpleDependencies
{
	return Array.isArray(dependencies);
}


/**
 * Checks whether the dependencies value is valid
 */
function areValidDependencies (dependencies: any) : dependencies is Dependencies
{
	const isArrayWithOnlyStrings = (value: Array<unknown>) => !value.some(entry => typeof entry !== "string");

	// is simple array -> must all be strings
	if (Array.isArray(dependencies))
	{
		return isArrayWithOnlyStrings(dependencies);
	}

	// if not an array, then it must be a nested value
	if (!Array.isArray(dependencies.modern) || !isArrayWithOnlyStrings(dependencies.modern))
	{
		return false;
	}

	if (dependencies.legacy)
	{
		return Array.isArray(dependencies.legacy) && isArrayWithOnlyStrings(dependencies.legacy);
	}

	return true;
}


/**
 * A map to handle the dependencies when loading files
 */
export class DependenciesMap
{
	private dependencies: Record<string, Dependencies> = {};

	/**
	 * Returns the dependencies for the given file
	 */
	public getDependencies (asset: string, baseUrl: string = "") : HtmlElement[]
	{
		let result: HtmlElement[] = [];
		const foundDeps = this.dependencies[asset];

		if (foundDeps)
		{
			if (areSimpleDependencies(foundDeps))
			{
				result = this.transformUrlsToElements(foundDeps, baseUrl);
			}
			else
			{
				result = this.transformUrlsToElements(foundDeps.modern, baseUrl, {type: "module"});

				if (foundDeps.legacy)
				{
					result = result.concat(
						this.transformUrlsToElements(foundDeps.legacy, baseUrl, {nomodule: true})
					);
				}
			}
		}
		else
		{
			result = result.concat(this.transformUrlsToElements([asset], baseUrl));
		}

		return result;
	}


	/**
	 * Transforms the URLs to elements
	 */
	private transformUrlsToElements (urls: string[], baseUrl: string, attrs: Readonly<Record<string, AttributeValue>> = {}) : HtmlElement[]
	{
		return urls.map(url => HtmlElement.generateFromUrl(path.join(baseUrl, url), attrs));
	}


	/**
	 */
	public static loadFromFile (filePath: string) : DependenciesMap
	{
		const map = new DependenciesMap();
		const data = readJsonSync(filePath);

		for (const key in data)
		{
			const dependencies = data[key];

			if (!areValidDependencies(dependencies))
			{
				throw new Error(`Invalid dependencies found at key '${key}' in file '${filePath}'`);
			}

			map.dependencies[key] = dependencies;
		}

		return map;
	}
}
