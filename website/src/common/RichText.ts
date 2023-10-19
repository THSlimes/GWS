import ElementFactory from "./html-element-factory/HTMLElementFactory";

/** Options used when parsing markdown */
type ParsingOptions = {
    allowMultilineBreaks?:boolean,
    skipLineBreaks?:boolean,
    allowDoubleSpaces?:boolean,

    maxWords?:number,
    maxChars?:number,
    allowBrokenWords?:boolean,
    cutoffMarker?:string
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



// CONFIG
type TagConfig = {
    name:string,
    isContainer:true,
    pattern: { open:RegExp, close:RegExp },
    parse(contents:string, attr:Record<string,string>):string
} | {
    name:string,
    isContainer:false,
    pattern:RegExp,
    parse(attr:Record<string,string>):string
};
const RT_TAG_CONFIG:Record<string,TagConfig> = {
    p: {
        name: "p",
        isContainer: true,
        pattern: { open: /<p>/g, close: /<\/p>/g },
        parse(contents, attr) {
            return RichText.parseLine(contents);
        },
    },
    br: {
        name: "br",
        isContainer: false,
        pattern: /<br>/g,
        parse(attr) { return "\r\n" },
    }
};

enum TagType { OPEN, CLOSE, SINGLE }
type TagMatch = {
    name: string,
    match: string,
    range: { from:number, to:number},
    type: TagType
};

/** Makes a piece of text HTML-safe. */
function sanitize(text:string):string {
    for (let c in ESCAPE_CONFIG) text = text.replaceAll(c, ESCAPE_CONFIG[c]);
    return text;
}

export default abstract class RichText {

    public static parseLine(text:string):string {
        text = sanitize(text);
        text = text
            .replaceAll(/\/(.*)\//g, s => `<span class="italic">${s.substring(1,s.length-1)}</span>`) // italic
            .replaceAll(/\*(.*)\*/g, s => `<span class="bold">${s.substring(1,s.length-1)}</span>`) // bold
            .replaceAll(/_(.*)_/g, s => `<span class="underlined">${s.substring(1,s.length-1)}</span>`) // underlined
            .replaceAll(/~(.*)~/g, s => `<span class="strikethrough">${s.substring(1,s.length-1)}</span>`) // strikethrough
            .replaceAll(/```(.*)```/g, s => `<span class="monospace">${s.substring(3,s.length-3)}</span>`); // monospace

        return text;
    }

    /**
     * Turns richtext-formatted text into HTML.
     * @param text richtext-formatted text
     * @param options options used while parsing
     * @returns converted richtext
     */
    public static parse(text:string, options:ParsingOptions={}):HTMLDivElement {
        const out = ElementFactory.div().class("rich-text");

        const tags = this.findTags(text);

        out.children(ElementFactory.p().html(this.parseLine(text))); // TODO: IMPLEMENT RICHTEXT PARSER
        return out.make();
    }

    private static findTags(text:string):TagMatch[] {
        const out:TagMatch[] = [];

        for (const name in RT_TAG_CONFIG) {
            const tagConfig = RT_TAG_CONFIG[name];
            if (tagConfig.isContainer) { // find opening and closing matches
                const openMatches = [...text.matchAll(tagConfig.pattern.open)];
                out.push(...openMatches.map(m => ({
                    name,
                    match: m[0],
                    range: { from: m.index!, to: m.index! + m.length },
                    type: TagType.OPEN
                })));

                const closeMatches = [...text.matchAll(tagConfig.pattern.close)];
                out.push(...closeMatches.map(m => ({
                    name,
                    match: m[0],
                    range: { from: m.index!, to: m.index! + m.length },
                    type: TagType.CLOSE
                })));
            }
            else { // only match single tags
                const matches = [...text.matchAll(tagConfig.pattern)];
                out.push(...matches.map(m => ({
                    name,
                    match: m[0],
                    range: { from: m.index!, to: m.index! + m.length },
                    type: TagType.SINGLE
                })));
            }
        }

        return out;
    }

}