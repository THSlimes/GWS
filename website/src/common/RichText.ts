import ElementFactory from "./html-element-factory/ElementFactory";

/** Options used when parsing markdown */
type ParsingOptions = {
    allowMultilineBreaks?:boolean,
    skipLineBreaks?:boolean,
    allowDoubleSpaces?:boolean,

    maxWords?:number,
    cutoffMarker?:string,

    disallowedTags?:string[],
    classes?:string[]
};



// General
/** Maps certain characters to their HTML escape-code. */
const ESCAPE_CONFIG:Record<string,string> = {
    '<': "&lt;",
    '>': "&gt;",
    '"': "&quot;",
    '(': "&#40;",
    ')': "&#41;",
    '+': "&#43;",
    ',': "&#44;",
    '-': "&#45;",
    '.': "&#46;",
    '=': "&#61;",
    '`': "&#96;",
};
Object.seal(ESCAPE_CONFIG);

/**
 * Recursively removes all nodes with a certain tag
 * @param node node to remove children from
 * @param tags tags to remove
 * @returns 'node', after processing
 */
function removeTags(node:ParentNode, ...tags:string[]) {
    for (let i = 0; i < node.childElementCount; i ++) {
        const c = node.children[i];
        if (tags.some(t => t.toLowerCase() === c.tagName.toLowerCase())) c.remove();
        else if (c.childElementCount !== 0) removeTags(c, ...tags);
    }

    return node;
}

function isJSLink(link:string|URL) {
    if (typeof link === "string") link = new URL(link);
    return link.protocol === "javascript:";
}
const URI_ATTRIBUTES:Record<string, string|string[]> = {
    a: "href",
    applet: "codebase",
    area: "href",
    base: "href",
    blockquote: "cite",
    body: "background",
    del: "cite",
    form: "action",
    frame: ["longdesc", "src"],
    head: "profile",
    iframe: ["longdesc", "src"],
    img: ["longdesc", "src", "usemap"],
    input: ["src", "usemap", "formaction"],
    ins: "cite",
    link: "href",
    object: ["classid", "codebase", "data", "usemap"],
    q: "cite",
    script: "src",
    audio: "src",
    button: "formaction",
    command: "icon",
    embed: "src",
    html: "manifest",
    source: "src",
    track: "src",
    video: ["poster", "src"] 
};
const URI_SPECIAL:Record<string, string> = {
    img: "srcset",
    source: "srcset",
    object: "archive",
    applet: "archive",
    meta: "content"
}

/** Recursively removes a "javascript:" protocol links from the element and its children. */
function removeJSLinks(elem:ParentNode) {
    if (elem instanceof Element) {
        let attr:string|string[];
        if (attr = URI_ATTRIBUTES[elem.tagName.toLowerCase()]) { // can have a URI attribute
            if (typeof attr === "string") elem.removeAttribute(attr);
            else attr.forEach(a => {
                if (elem.hasAttribute(a) && isJSLink(elem.getAttribute(a)!)) elem.removeAttribute(a);
            });
        }
        if (attr = URI_SPECIAL[elem.tagName.toLowerCase()]) { // special uri attributes
            if (elem.hasAttribute(attr)) elem.setAttribute(attr, elem.getAttribute(attr)!.replaceAll("javascript:", ""));
        }
    }

    // remove in children
    for (let i = 0; i < elem.childElementCount; i ++) removeJSLinks(elem.children[i]);

    return elem;
}

/** Makes a piece of text HTML-safe. */
function sanitize(text:string):string {
    for (let c in ESCAPE_CONFIG) text = text.replaceAll(c, ESCAPE_CONFIG[c]);
    return text;
}

const ENDS_WORD = /\ |\n|\,|\;|\:|\.|\?|\!/g

export default abstract class RichText {

    public static parseLine(text:string, doSanitize=true):string {
        if (doSanitize) text = sanitize(text);
        // text = text
        //     .replaceAll(/\/((?!(<\/*[a-zA-Z0-9 ]*>)).|\n)*?\//g, s => `<span class="italic">${s.substring(1,s.length-1)}</span>`) // italic
        //     .replaceAll(/\*((?!(<\/*[a-zA-Z0-9 ]*>)).|\n)*\*/g, s => `<span class="bold">${s.substring(1,s.length-1)}</span>`) // bold
        //     .replaceAll(/_((?!(<\/*[a-zA-Z0-9 ]*>)).|\n)*_/g, s => `<span class="underlined">${s.substring(1,s.length-1)}</span>`) // underlined
        //     .replaceAll(/~((?!(<\/*[a-zA-Z0-9 ]*>)).|\n)*~/g, s => `<span class="strikethrough">${s.substring(1,s.length-1)}</span>`) // strikethrough
        //     .replaceAll(/```((?!(<\/*[a-zA-Z0-9 ]*>)).|\n)*```/g, s => `<span class="monospace">${s.substring(3,s.length-3)}</span>`); // monospace

        return text;
    }

    /**
     * Turns richtext-formatted text into HTML.
     * @param text richtext-formatted text
     * @param options options used while parsing
     * @returns converted richtext
     */
    public static parse(text:string, options:ParsingOptions={}):HTMLDivElement {
        text = this.parseLine(text, false); // apply text styling

        if (!options.allowDoubleSpaces) text = text.replaceAll(/ +/g, ' ');
        if (options.skipLineBreaks) text = text.replaceAll(/(<br>)|(\n)/g, "");
        else if (!options.allowMultilineBreaks) text = text.replaceAll(/(<br>)+/g, "<br>").replaceAll("\n+", '\n');

        // parse as HTML
        const parser = new DOMParser();
        
        const doc = parser.parseFromString(text, "text/html");
        // remove XSS sources
        removeTags(doc, "script", ...(options.disallowedTags ?? []));
        removeJSLinks(doc);

        if (typeof options.maxWords === "number") { // limit number of words / letters
            let wordsLeft = options.maxWords;

            // count using depth-first-search of dom-tree
            const frontier:Node[] = [doc.body];
            while (frontier.length !== 0) {
                const elem = frontier.shift()!;

                if (wordsLeft <= 0) elem.parentElement?.removeChild(elem); // remove everything after word limit
                else { // word limit not hit yet
                    if (elem instanceof Text) { // only count words in text-nodes
                        for (let i = 1; i < elem.data.length; i ++) {
                            if (!ENDS_WORD.test(elem.data[i-1]) && ENDS_WORD.test(elem.data[i])) {
                                if (--wordsLeft <= 0) { // hit word limit
                                    elem.data = elem.data.substring(0,i) + options.cutoffMarker ?? "";
                                    break;
                                }
                            }
                        }
                    }

                    // expand frontier
                    const expansion:Node[] = [];
                    elem.childNodes.forEach(n => expansion.push(n));
                    frontier.unshift(...expansion);
                }
            }
        }

        // extract children :)
        const children:Node[] = [];
        doc.body.childNodes.forEach(c => children.push(c));

        return ElementFactory.div()
            .class("rich-text", ...(options.classes ?? []))
            .children(...children)
            .make();
    }

}