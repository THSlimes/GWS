import { clamp } from "./NumberUtil";
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
type BlockQuoteElement = ["block quote", string, number];

type MarkdownElement = HeadingElement | BreakElement | ParagraphElement | BlockQuoteElement;
type IntermediateMarkdown = MarkdownElement[];



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
    '/': "&#47;",
    '=': "&#61;",
    '`': "&#96;",
};
Object.seal(ESCAPE_CONFIG);

/** Makes a piece of text HTML-safe. */
function sanitize(text:string):string {
    for (let c in ESCAPE_CONFIG) text = text.replaceAll(c, ESCAPE_CONFIG[c]);
    return text;
}

// Headings
function isHeading(line:string) { return line.trimStart().startsWith('#') }
function parseHeading(line:string, forceSize?:number):HeadingElement {
    let size = 0;
    line = line.trimStart();
    while (line.startsWith('#')) [size, line] = [size+1, line.substring(1)];
    [size, line] = [Math.min(size, 6), line.trimStart()];

    // possibly override size
    if (forceSize !== undefined) size = clamp(Math.floor(forceSize), 1, 6);

    return ["heading", Markdown.parseLine(line), size];
}

const HEADING_ALT_1 = /^=+$/g;
const HEADING_ALT_2 = /^-+$/g;


// PARAGRAPHS
function makeParagraph(lines:string[]) {
    const out = ElementFactory.p().class("paragraph").make();
    out.innerHTML = lines.map(line => Markdown.parseLine(line)).join("<br>");
    return out;
}


// BLOCK QUOTES
function isBlockQuote(line:string) { return line.trimStart().startsWith('>') }
function parseBlockQuote(line:string):BlockQuoteElement {
    let level = 0;
    line = line.trimStart();
    while (line.startsWith('>')) [level, line] = [level+1, line.substring(1).trimStart()];

    return ["block quote", line, level];
}



// Parsing
/** Splits into lines */
function preprocess(text:string, options:ParsingOptions={}):string[] {

    if (!options.allowDoubleSpaces) text.replaceAll(/ {2,}/g, ' '); // remove double spaces

    // split into lines
    const lines = text.split(/(?:\r\n)|(?:\n)/g);
    while (lines.length > 0 && lines[0].length === 0) lines.shift(); // remove initial whitespace
    while (lines.at(-1)!.length === 0) lines.pop(); // remove trailing whitespace

    return lines;
}

/* Parses to intermediate form which is easier to handle. */
function toIntermediate(lines:string[], options:ParsingOptions):IntermediateMarkdown {

    const intermediate:IntermediateMarkdown = [];
    
    for (let i = 0; i < lines.length; i ++) {
        const line = lines[i];

        if (isHeading(line)) intermediate.push(parseHeading(line)); // is heading
        else if (HEADING_ALT_1.test(lines[i+1]?.trim() ?? "")) { // alternative heading syntax            
            intermediate.push(parseHeading(line, 1));
            lines.splice(i+1,1);
        }
        else if (HEADING_ALT_2.test(lines[i+1]?.trim() ?? "")) { // alternative heading syntax
            intermediate.push(parseHeading(line, 2));
            lines.splice(i+1,1);
        }
        else if (isBlockQuote(line)) {
            
        }
        else if (line.length === 0) intermediate.push(["line break"]); // empty line
        else { // part of paragraph
            if (intermediate.length === 0 || intermediate.at(-1)![0] !== "paragraph") { // is paragraph
                intermediate.push(["paragraph", Markdown.parseLine(line)]); // new paragraph
            }
            else intermediate.at(-1)![1] += "<br>" + Markdown.parseLine(line); // part of known paragraph
        }
    }

    return intermediate;
}

/** RegExp of characters that do not occur within a word. */
const ENDS_WORD = /(\ |\t|\,|\;|\:|\.|\!|\?)+/g;
/** Applies parsing options. */
function applyOptions(intermediate:IntermediateMarkdown, options:ParsingOptions={}) {

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
                        if (!ENDS_WORD.test(elem[1][j]) && ENDS_WORD.test(elem[1][j+1]??"")) wordsLeft--;

                        else if (wordsLeft <= 0 || charsLeft <= 0 && (options.allowBrokenWords || (!options.allowBrokenWords && ENDS_WORD.test(elem[1][j])))) {
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

    return intermediate;

}

function toHTMLElements(intermediate:IntermediateMarkdown, options:ParsingOptions={}):HTMLElement[] {
    const out:HTMLElement[] = [];

    for (let i = 0; i < intermediate.length; i ++) {
        const e = intermediate[i];
        
        switch (e[0]) {
            case "heading":
                out.push(ElementFactory.heading(e[2]).html(e[1]).make());
                break;
            case "line break":
                out.push(ElementFactory.br().make());
                break;
            case "paragraph":
                out.push(ElementFactory.p().html(e[1]).make());
                break;
        }
    }

    return out;
}

/**
 * The Markdown helper-class provides utility to parse the
 * Markdown text format to HTML.
 * 
 * @see https://www.markdownguide.org/basic-syntax/
 */
export default abstract class Markdown {

    private static readonly IS_BOLD = /(\*\*.+?\*\*)|(__.+?__)/g;
    private static readonly IS_ITALIC = /(\*.+?\*)|(_.+?_)/g;
    public static parseLine(line:string):string {
        line = sanitize(line);        
    
        // apply bold
        line = line.replaceAll(this.IS_BOLD, s => `<span class="bold">${s.substring(2, s.length-2)}</span>`);
        // apply italic
        line = line.replaceAll(this.IS_ITALIC, s => `<span class="italic">${s.substring(1, s.length-1)}</span>`);
    
        return line;
    }
    /**
     * Turns markdown-formatted text into HTML.
     * @param text markdown-formatted text
     * @param options options used while parsing
     * @returns converted markdown
     */
    public static parse(text:string, options:ParsingOptions={}):HTMLDivElement {
        const parsed = toHTMLElements( // 4. convert to HTMLElement[]
            applyOptions( // 3. apply parsing options
                toIntermediate( // 2. convert to intermediate
                    preprocess( // 1. preprocess
                        text, options
                    ), options
                ), options
            ), options
        );
        
        // convert to HTML element
        return ElementFactory.div()
            .class("markdown")
            .children(...parsed)
            .make();
    }

}