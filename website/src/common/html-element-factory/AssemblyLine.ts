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

type Child = Node|AssemblyLine<any>|null|false;
function toNodes(children:Child[]):Node[] {
    const out:Node[] = [];
    for (const c of children) {
        if (c instanceof Node) out.push(c);
        else if (c instanceof AssemblyLine) out.push(c.make());
    }

    return out;
}
type ChildGenerator<SelfType extends HTMLElement> = (self:SelfType) => Child|Child[];

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
    public class(...classes:(string|null|false)[]) {
        for (const c of classes) {
            if (typeof c === "string") this._classes.add(c);
        }
        return this;
    }

    protected _attributes:Record<string,string> = {};
    /** Sets a single attribute of the new element. */
    public attr(k:string, v:{toString():string}|null="") {
        if (v !== null) this._attributes[k] = v.toString();
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
    public tooltip(txt:string|null) {
        if (txt) this._tooltip = txt;
        return this;
    }

    private _html?:string;
    /** Sets the ```innerHTML``` property. */
    public html(html:string) {
        this._html = html;
        return this;
    }

    private _children:(Child|ChildGenerator<HTMLElementTagNameMap[TN]>)[]= [];
    /** Provides child elements to be appended to the output element. */
    public children(...children:(Child|ChildGenerator<HTMLElementTagNameMap[TN]>)[]) {
        this._children.push(...children.filter(n => n !== null));
        return this;
    }

    private _styleProps:Record<string,string|null> = {};
    /** Defines key-value pairs for CSS-properties. */
    public style(styleMap:Record<string,{ toString():string }|null>) {
        for (const k in styleMap) {
            if (styleMap[k] !== null) this._styleProps[k] = styleMap[k]!.toString();
        }
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
        for (const c of this._children) {
            if (c) {
                if (c instanceof Node) out.appendChild(c);
                else if (c instanceof AssemblyLine) out.appendChild(c.make());
                else {
                    let res = c(out);
                    if (!Array.isArray(res)) res = [res];
                    out.append(...toNodes(res));
                }
            }
        }

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

type SmartSelect = HTMLSelectElement & { prevValue?:string };
export class SelectAssemblyLine extends AssemblyLine<"select"> {

    constructor() {
        super("select");
    }

    private _options:Record<string,[string,boolean]> = {};
    /** Adds a single option to the select element. */
    public option(value:string, displayText=value, hidden=false) {
        this._options[value] = [displayText, hidden];
        return this;
    }
    /** Adds multiple options at once to the select element. */
    public options(values:(string|[string,boolean])[]|Record<string,string|[string,boolean]>) {
        if (Array.isArray(values)) values.forEach(v => {
            if (Array.isArray(v)) this._options[v[0]] = v;
            else this._options[v] = [v, false];
        });
        else for (const v in values) {
            const display = values[v];
            this._options[v] = Array.isArray(display) ? display : [display, false];
        }

        return this;
    }

    private _value?:string;
    public value(value:string) {
        this._value = value;
        return this;
    }

    private _onValueChanged?:(curr:string, prev?:string)=>void
    public onValueChanged(callback:(curr:string, prev?:string)=>void) {
        this._onValueChanged = callback;
        return this;
    }

    public override make(): SmartSelect {
        const out = super.make() as SmartSelect;

        for (const v in this._options) {
            const option = document.createElement("option");
            option.value = v;
            option.selected = v === this._value;
            option.innerText = this._options[v][0];
            if (this._options[v][1]) option.hidden = true;
            out.options.add(option);
        }

        window.addEventListener("change", e => {
            if (e.target === out) out.prevValue = out.value;
        });

        if (this._onValueChanged) {
            const valueCallback = this._onValueChanged;
            out.addEventListener("change", () => valueCallback(out.value, out.prevValue));
        }

        return out;
    }

}