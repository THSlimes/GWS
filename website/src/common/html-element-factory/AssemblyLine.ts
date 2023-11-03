export type HexColor = `#${string}`;

/**
 * OptionalElementProperties defines a mapping for values of a specific
 * type of HTMLElement/
 *
 * @param TN tag of the HTMLElement that the mapping is used for
 */
type OptionalElementProperties<TN extends keyof HTMLElementTagNameMap> = {
    [K in keyof HTMLElementTagNameMap[TN]]?: HTMLElementTagNameMap[TN][K];
}

type EventHandlers<S> = {
    [T in keyof HTMLElementEventMap]?: (event:HTMLElementEventMap[T], self:S) => void;
}

/**
 * An AssemblyLine is a type of object that makes the construction
 * of HTMLElement objects easier. All methods (except for ```make()```)
 * return ```this```, making for easy method-chaining.
 *
 * @param TN tag of the HTMLElement that will be output by its ```make()``` method
 */
export default class AssemblyLine<TN extends keyof HTMLElementTagNameMap> {

    private readonly tagName:TN;

    private readonly elementTypeSpecific:OptionalElementProperties<TN> = {};

    constructor(tagName:TN) {
        this.tagName = tagName; // store tag for element creation
    }

    protected _id?:string;
    /** Sets the id of the new element. */
    public id(newId:string) {
        this._id = newId;
        return this;
    }

    protected _classes = new Set<string>();
    /** Adds classes to the new element */
    public class(...classes:(string|null)[]) {
        for (const c of classes) {
            if (typeof c === "string") this._classes.add(c);
        }
        return this;
    }

    protected _attributes:Record<string,string> = {};
    /** Sets a single attribute of the new element. */
    public attr(k:string, v:{toString():string}="") {
        this._attributes[k] = v.toString();
        return this;
    }
    /** Sets multiple attributes of the new element. */
    public attrs(attributes:Record<string,{toString():string}>) {
        for (const k in attributes) this._attributes[k] = attributes[k].toString();
        return this;
    }

    private _text?:string;
    /** Sets the ```innerText``` property. */
    public text(txt:string) {
        this._text = txt;
        return this;
    }

    private _tooltip?:string;
    /** Provides text to be displayed when hovering over the element (value for the ```title``` attribute) */
    public tooltip(txt:string) {
        this._tooltip = txt;
        return this;
    }

    private _html?:string;
    /** Sets the ```innerHTML``` property. */
    public html(html:string) {
        this._html = html;
        return this;
    }

    private _children:Node[] = [];
    /** Provides child elements to be appended to the output element. */
    public children(...nodes:(Node|null|AssemblyLine<any>)[]) {
        nodes = nodes.filter(n => n !== null);
        this._children.push(...nodes.map(n => n instanceof AssemblyLine ? n.make() : n));
        return this;
    }

    private _styleProps:Record<string,string> = {};
    /** Defines key-value pairs for CSS-properties. */
    public style(styleDef:Record<string,string>) {
        for (const k in styleDef) this._styleProps[k] = styleDef[k];
        return this;
    }

    private _handlers:EventHandlers<HTMLElementTagNameMap[TN]> = {};
    public on<T extends keyof HTMLElementEventMap>(keyword:T, handler:EventHandlers<HTMLElementTagNameMap[TN]>[T]) {
        this._handlers[keyword] = handler;
        return this;
    }

    private _onMake?:(self:HTMLElementTagNameMap[TN])=>void;
    /** Provides a callback to be run after the element is created. */
    public onMake(handler:(self:HTMLElementTagNameMap[TN])=>void) {
        this._onMake = handler;
        return this;
    }

    /** Finalizes and creates the new element. */
    public make():HTMLElementTagNameMap[TN] {
        const out = document.createElement(this.tagName);

        // id, class and attributes
        if (this._id !== undefined) out.id = this._id;
        if (this._classes.size > 0) out.classList.add(...this._classes);
        for (const k in this._attributes) out.setAttribute(k, this._attributes[k]);

        // innerHTML
        if (this._html) out.innerHTML = this._html;

        // text
        if (this._text !== undefined) out.innerText = this._text;
        if (this._tooltip !== undefined) out.title = this._tooltip;

        // children
        out.append(...this._children);

        // style
        for (const k in this._styleProps) out.style.setProperty(k, this._styleProps[k]);

        // element-type specific properties
        for (const k in this.elementTypeSpecific) out[k] = this.elementTypeSpecific[k]!;

        // event-handlers
        for (const keyword of Object.keys(this._handlers)) {
            const key = keyword as keyof typeof this._handlers;
            const handler = this._handlers[key]!;
            out.addEventListener(key, e => handler(e as any, out));
        }

        if (this._onMake !== undefined) this._onMake(out);

        return out;
    }

    /**
     * Provides a way to create an AssemblyLine for a specific element type, without
     * creating a new class for each one.
     * @param tagName tag of the HTMLElement of the output AssemblyLine
     * @param exposedKeys keys of specific properties of the out HTMLElement type
     * @returns AssemblyLine with extra methods to set the properties with the keys from 'exposedKeys'
     */
    public static specific<TN extends keyof HTMLElementTagNameMap, EKs extends keyof HTMLElementTagNameMap[TN]>(tagName:TN, exposedKeys:EKs[]) {
        const out = new AssemblyLine(tagName) as AssemblyLine<TN> & {
            [K in EKs]:(newVal:HTMLElementTagNameMap[TN][K])=>typeof out;
        };

        for (const k of exposedKeys) Reflect.defineProperty(out, k, {
            writable:false,
            value:(newVal:any) => {
                out.elementTypeSpecific[k] = newVal;
                return out;
            }
        })

        return out;
    }

}

/**
 * An AnchorElementAssemblyLine is a type of AssemblyLine for creating anchor (\<a>) tags
 */
export class AnchorElementAssemblyLine extends AssemblyLine<"a"> {

    constructor() {
        super("a");
    }

    private _href?:string;
    /** Provides the URL that the anchor will link to. */
    public href(linkTo:string) {
        this._href = linkTo;
        return this;
    }

    private _openInNewTab = false;
    /** Determines whether the link opens in a new tab. */
    public openInNewTab(openInNewTab:boolean) {
        this._openInNewTab = openInNewTab;
        return this;
    }

    public override make(): HTMLAnchorElement {
        const out = super.make();

        if (this._href !== undefined) out.href = this._href;
        if (this._openInNewTab) out.target = "_blank";

        return out;
    }

}