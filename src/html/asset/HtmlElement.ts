import {escapeHtml} from '../../lib/html';
import path from "path";

export type AttributeValue = string|number|boolean|null|undefined;

const EMPTY_ELEMENTS = [
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
];

export class HtmlElement
{
	/**
	 *
	 */
	public constructor (
		private type: string,
		private attributes: Record<string, AttributeValue>
	) {
	}

	/**
	 * Sets an attribute
	 */
	public setAttribute (name: string, value: AttributeValue) : this
	{
		this.attributes[name] = value;
		return this;
	}

	/**
	 * Renders the element to HTML
	 */
	public toHtml () : string
	{
		let attrs = this.generateAttributesHtml();

		if ("" !== attrs)
		{
			attrs = ` ${attrs}`;
		}

		return EMPTY_ELEMENTS.includes(this.type)
			? `<${this.type}${attrs}/>`
			: `<${this.type}${attrs}></${this.type}>`;
	}

	/**
	 * Generates the HTML for the attributes
	 */
	private generateAttributesHtml () : string
	{
		const html: string[] = [];

		for (const name in this.attributes)
		{
			const value = this.attributes[name];

			// check for undefined, null and false
			if (null == value || false === value)
			{
				continue;
			}

			if (true === value)
			{
				html.push(name);
				continue;
			}

			html.push(`${name}="${escapeHtml("" + value)}"`);
		}

		return html.join(" ");
	}

	/**
	 * Generates a new HtmlElement from the given URL
	 */
	public static generateFromUrl (url: string, attrs: Readonly<Record<string, AttributeValue>> = {}) : HtmlElement
	{
		const extension = path.extname(url);

		if (".css" === extension)
		{
			return new HtmlElement("" +
				"link",
				{
					...attrs,
					rel: "stylesheet",
					href: url,
				},
			);
		}

		if (".js" === extension)
		{
			return new HtmlElement(
				"script",
				{
					...attrs,
					defer: true,
					src: url,
				},
			);
		}

		throw new Error(`Can't include asset with extension '${extension}'`);
	}
}
