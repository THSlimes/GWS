import RichTextInput from "../custom-elements/rich-text/RichTextInput";
import StyleUtil, { StyleMap } from "../util/StyleUtil";

/**
 * OptionalElementProperties defines a mapping for values of a specific
 * type of HTMLElement/
 *
 * @param TN tag of the HTMLElement that the mapping is used for
 */
type OptionalElementProperties<E extends HTMLElement> = {
    [K in keyof E]?: E[K];
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

type ElementType<S extends string> = S extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[S] : HTMLElement;
type Class<T> = new (...args:any[]) => T;

type UserSelect =  "none" | "auto" | "text" | "contain" | "all";

/**
 * An AssemblyLine is a type of object that makes the construction
 * of HTMLElement objects easier. All methods (except for ```make()```)
 * return ```this```, making for easy method-chaining.
 *
 * @param TN tag of the HTMLElement that will be output by its ```make()``` method
 */
export default class AssemblyLine<TN extends string, E extends ElementType<TN> = ElementType<TN>> {

    private readonly tagName:TN;
    private readonly initElem?:()=>E;

    private readonly elementTypeSpecific:OptionalElementProperties<E> = {};

    /**
     * Creates a new AssemblyLine.
     * @param tagName element tag name (e.g. "a" or "h3")
     * @param initElem custom function to instantiate the element
     */
    constructor(tagName:TN, initElem?:()=>E) {
        this.tagName = tagName; // store tag for element creation
        this.initElem = initElem;
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
    /** Sets the ```textContent``` property. */
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

    private _draggable?:boolean;
    public draggable(isDraggable:boolean):this {
        this._draggable = isDraggable;
        return this;
    }

    private _noFocus?:boolean;
    public noFocus(doNoFocus=true):this {
        this._noFocus = doNoFocus;
        return this;
    }

    private _canSelect?:UserSelect;
    public canSelect(canSelect:UserSelect|boolean):this {
        if (canSelect === true) canSelect = "all";
        else if (canSelect === false) canSelect = "none";
        
        this._canSelect = canSelect;
        return this;
    }

    private _html?:string;
    /** Sets the ```innerHTML``` property. */
    public html(html:string) {
        this._html = html;
        return this;
    }

    private _children:(Child|ChildGenerator<E>)[]= [];
    /** Provides child elements to be appended to the output element. */
    public children(...children:(Child|ChildGenerator<E>)[]) {
        this._children.push(...children.filter(n => n !== null));
        return this;
    }

    private _styleMap:StyleMap = {};
    /** Defines key-value pairs for CSS-properties. */
    public style(styleMap:StyleMap) {
        for (const k in styleMap) {
            const v = styleMap[k];
            if (v === undefined) delete this._styleMap[k];
            else this._styleMap[k] = v;
        }
        return this;
    }

    private _handlers:EventHandlers<E> = {};
    public on<T extends keyof HTMLElementEventMap>(keyword:T, handler:EventHandlers<E>[T]) {
        this._handlers[keyword] = handler;
        return this;
    }

    private _onMake?:(self:E)=>void;
    /** Provides a callback to be run after the element is created. */
    public onMake(handler:(self:E)=>void) {
        this._onMake = handler;
        return this;
    }

    /** Finalizes and creates the new element. */
    public make():E {
        const out = this.initElem ? this.initElem() : document.createElement(this.tagName) as E;

        // id, class and attributes
        if (this._id !== undefined) out.id = this._id;
        if (this._classes.size > 0) out.classList.add(...this._classes);
        for (const k in this._attributes) out.setAttribute(k, this._attributes[k]);

        // innerHTML
        if (this._html) out.innerHTML = this._html;

        // text
        if (this._text !== undefined) out.textContent = this._text;
        if (this._tooltip !== undefined) out.title = this._tooltip;
        if (this._draggable) out.draggable = true;
        if (this._noFocus) out.addEventListener("mousedown", ev => ev.preventDefault());
        if (this._canSelect) out.style.userSelect = this._canSelect;

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
        StyleUtil.apply(this._styleMap, out);

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
    public static specific<TN extends keyof HTMLElementTagNameMap, EKs extends keyof ElementType<TN>>(tagName:TN, exposedKeys:EKs[], initElem:()=>ElementType<TN>) {
        const out = new AssemblyLine(tagName, initElem) as AssemblyLine<TN> & {
            [K in EKs]:(newVal:ElementType<TN>[K])=>typeof out;
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

    private _downloadLink?:string;
    public download(downloadLink:string="") {
        this._downloadLink = downloadLink;
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
        if (this._downloadLink !== undefined) out.download = this._downloadLink;
        if (this._openInNewTab) out.target = "_blank";

        return out;
    }

}

type SmartSelect<V extends string> = HTMLSelectElement & { prevValue?:V };
export class SelectAssemblyLine<V extends string> extends AssemblyLine<"select"> {

    constructor() {
        super("select");
    }

    private _options:Record<string,[string,boolean]> = {};
    /** Adds a single option to the select element. */
    public option<AV extends string>(value:AV, displayText=value as string, hidden=false) {
        this._options[value] = [displayText, hidden];
        return this as SelectAssemblyLine<V|AV>;
    }

    /** Adds multiple options at once to the select element. */
    public options<AV extends string>(values:(AV|[AV,boolean])[]|Record<AV,string|[string,boolean]>) {
        if (Array.isArray(values)) values.forEach(v => {
            if (Array.isArray(v)) this._options[v[0]] = v;
            else this._options[v] = [v, false];
        });
        else for (const v in values) {
            const display = values[v];
            this._options[v] = Array.isArray(display) ? display : [display, false];
        }

        return this as SelectAssemblyLine<V|AV>;
    }

    private _value?:V;
    public value(value:V) {
        this._value = value;
        return this;
    }

    private _onValueChanged?:(curr:V, prev?:V)=>void
    public onValueChanged(callback:(curr:V, prev?:V)=>void) {
        this._onValueChanged = callback;
        return this;
    }

    public override make(): SmartSelect<V> & { value:V } {
        const out = super.make() as SmartSelect<V> & { value:V };

        for (const v in this._options) {
            const option = document.createElement("option");
            option.value = v;
            option.selected = v === this._value;
            option.textContent = this._options[v][0];
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

export class RichTextInputAssemblyLine extends AssemblyLine<"rich-text-input", RichTextInput> {

    constructor() {
        super("rich-text-input", () => new RichTextInput);
    }

    private _value?:string;
    public value(val:string):this {
        this._value = val;

        return this;
    }

    public override make() {
        const out = super.make();

        if (this._value) out.value = this._value;

        return out;
    }

}