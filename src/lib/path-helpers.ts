import escapeStringRegexp from 'escape-string-regexp';

export function getExcludePattern (compiledNpmPackages: string[]) : RegExp
{
	const matcher = compiledNpmPackages.map(escapeStringRegexp).join("|");
	return new RegExp(`node_modules\\/(?!((${matcher})\\/)).*$`);
}
