import {DependenciesMap} from './DependenciesMap';

/**
 * Includes the given assets
 */
export function includeAssets (
	assets: string[],
	map: DependenciesMap,
	baseUrl: string
)
{
	const html: string[] = [];

	assets.forEach(asset => {
		map.getDependencies(asset, baseUrl).forEach(element => html.push(element.toHtml()));
	});

	return html.join("");
}
