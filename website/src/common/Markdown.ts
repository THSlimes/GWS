import ElementFactory from "./html-element-factory/HTMLElementFactory";

/** Options used when parsing markdown */
type ParsingOptions = {
    allowMultilineBreaks?:boolean,
    allowDoubleSpaces?:boolean,

    maxWords?:number,
    maxChars?:number,
    allowBrokenWords?:boolean,
    cutoffMarker?:string
};

// types for intermediate representation
type HeadingElement = ["heading", string, number];
type BreakElement = ["line break"];
type ParagraphElement = ["paragraph", string];

type MarkdownElement = HeadingElement | BreakElement | ParagraphElement;

/**
 * The Markdown helper-class provides utility to parse the
 * Markdown text format to HTML.
 * 
 * @see https://www.markdownguide.org/basic-syntax/
 */
export default abstract class Markdown {

    /** Maps certain characters to their HTML escape-code. */
    private static readonly ESCAPE_CONFIG:Record<string,string> = {
        '<': "&lt;",
        '>': "&gt;",
        '"': "&quot;",
        '(': "&#40;",
        ')': "&#41;",
        '+': "&#43;",
        ',': "&#44;",
        '-': "&#45;",
        '.': "&#46;",
        '/': "&#47;",
        '=': "&#61;",
        '`': "&#96;",
    };
    /** Makes a piece of text HTML-safe. */
    public static sanitize(text:string):string {
        for (let c in this.ESCAPE_CONFIG) text = text.replaceAll(c, this.ESCAPE_CONFIG[c]);
        return text;
    }

    private static isHeading(line:string) { return line.startsWith('#') }
    private static parseHeading(line:string):HeadingElement {
        let size = 0;
        while (line.startsWith('#')) [size, line] = [size+1, line.substring(1)];
        [size, line] = [Math.min(size, 6), line.trim()];

        return ["heading", this.parseLine(line), size];
    }

    private static makeParagraph(lines:string[]) {
        const out = ElementFactory.p().class("paragraph").make();
        out.innerHTML = lines.map(line => this.parseLine(line)).join("<br>");
        return out;
    }
    private static readonly BOLD_REGEX = /(\*\*.+?\*\*)|(__.+?__)/g;
    private static readonly ITALIC_REGEX = /(\*.+?\*)|(_.+?_)/g;
    public static parseLine(line:string):string {
        line = this.sanitize(line);        

        // apply bold
        line = line.replaceAll(this.BOLD_REGEX, s => `<span class="bold">${s.substring(2, s.length-2)}</span>`);
        // apply italic
        line = line.replaceAll(this.ITALIC_REGEX, s => `<span class="italic">${s.substring(1, s.length-1)}</span>`);

        return line;
    }

    /** RegExp of characters that do not occur within a word. */
    private static readonly ENDS_WORD = /(\ |\t|\,|\;|\:|\.|\!|\?)+/g;
    /**
     * Turns markdown-formatted text into HTML.
     * @param text markdown-formatted text
     * @param options options used while parsing
     * @returns converted markdown
     */
    public static parse(text:string, options:ParsingOptions={}):HTMLDivElement {

        if (!options.allowDoubleSpaces) text.replaceAll(/ {2,}/g, ' '); // remove double spaces

        // split into lines
        const lines = text.split(/(?:\r\n)|(?:\n)/g).map(line => line.trim());
        while (lines.length > 0 && lines[0].length === 0) lines.shift(); // remove initial whitespace
        while (lines.at(-1)!.length === 0) lines.pop(); // remove trailing whitespace

        // parse to intermediate form which is easier to handle
        const intermediate:MarkdownElement[] = [];
        
        for (const line of lines) {
            if (this.isHeading(line)) intermediate.push(this.parseHeading(line)); // is heading
            else if (line.length === 0) intermediate.push(["line break"]); // empty line
            else { // part of paragraph
                if (intermediate.length === 0 || intermediate.at(-1)![0] !== "paragraph") { // is paragraph
                    intermediate.push(["paragraph", this.parseLine(line)]); // new paragraph
                }
                else intermediate.at(-1)![1] += "<br>" + this.parseLine(line); // part of known paragraph
            }
        }        

        // applying parsing options
        if (options.maxChars !== undefined || options.maxWords !== undefined) { // limit number of characters and words
            let charsLeft = options.maxChars ?? Infinity;
            let wordsLeft = options.maxWords ?? Infinity;

            for (let i = 0; i < intermediate.length; i ++) {
                const elem = intermediate[i];
                if (elem[0] === "heading" || elem[0] === "paragraph") {
                    for (let j = 0; j < elem[1].length; j ++) {
                        if (elem[1].startsWith("<br>", j)) j += 4; // skip br tags
                        else {
                            charsLeft--;
                            if (!this.ENDS_WORD.test(elem[1][j]) && this.ENDS_WORD.test(elem[1][j+1]??"")) wordsLeft--;

                            else if (wordsLeft <= 0 || charsLeft <= 0 && (options.allowBrokenWords || (!options.allowBrokenWords && this.ENDS_WORD.test(elem[1][j])))) {
                                elem[1] = elem[1].substring(0, j+1).trimEnd() + (options.cutoffMarker ?? " ...");
                                intermediate.splice(i+1, Infinity); // remove rest of elements
                                break;
                            }
                            
                        }
                    }
                }
            }
        }

        if (!options.allowMultilineBreaks) { // remove double line-breaks
            for (let i = 0; i < intermediate.length; i ++) {
                if (intermediate[i][0] === "line break") {
                    const WSStart = i; // start of white-space
                    while (intermediate[i][0] === "line break") i ++; // search for end of whitespace                    
                    if (i > WSStart+1) intermediate.splice(WSStart, i-WSStart, ["line break"]); // end found, remove whitespace
                }
            }
        }

        // convert to HTML element
        return ElementFactory.div()
            .class("markdown")
            .children(
                ...intermediate.map(e => {
                    switch (e[0]) {
                        case "heading": return ElementFactory.heading(e[2]).html(e[1]);
                        case "line break": return ElementFactory.br();
                        case "paragraph": return ElementFactory.p().html(e[1]);
                        default: return null;
                    }
                })
            )
            .make();
    }

}