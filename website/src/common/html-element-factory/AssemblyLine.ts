type HexColor = `#${string}`;

/**
 * OptionalElementProperties defines a mapping for values of a specific
 * type of HTMLElement/
 * 
 * @param TN tag of the HTMLElement that the mapping is used for
 */
type OptionalElementProperties<TN extends keyof HTMLElementTagNameMap> = {
    [K in keyof HTMLElementTagNameMap[TN]]?: HTMLElementTagNameMap[TN][K];
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
    public class(...classes:string[]) {
        for (const c of classes) this._classes.add(c);
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

        // children
        out.append(...this._children);

        // style
        for (const k in this._styleProps) out.style.setProperty(k, this._styleProps[k]);

        // element-type specific properties
        for (const k in this.elementTypeSpecific) out[k] = this.elementTypeSpecific[k]!;

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

/** Maps the 'type' field of an HTMLInputElement to the type of its 'value' field */
type HTMLInputElementTypeMap = {
    "button": string,
    "checkbox": string,
    "color": HexColor,
    "date": `${number}-${number}-${number}`,
    "datetime-local": `${number}-${number}-${number}T${number}:${number}`,
    "email": string,
    "file": string,
    "hidden": string,
    "image": "",
    "month": `${number}-${number}`,
    "number": number,
    "password": string,
    "radio": string,
    "range": number,
    "reset": string,
    "search": string,
    "submit": string,
    "tel": string,
    "text": string,
    "time": `${number}:${number}`,
    "url": string,
    "week": `${number}-W${number}`
};

/** Default values for each input type.  */
const DEFAULT_VALUES:{[T in keyof HTMLInputElementTypeMap]:HTMLInputElementTypeMap[T]} = {
    button: "Button",
    checkbox: "Checkbox",
    color: "#000000",
    date: new Date().toDateString() as `${number}-${number}-${number}`,
    "datetime-local": new Date().toISOString() as `${number}-${number}-${number}T${number}:${number}`,
    email: "",
    file: "",
    hidden: "",
    image: "",
    month: `01-01`,
    number: 0,
    password: "",
    radio: "Radio",
    range: 0,
    reset: "Reset",
    search: "",
    submit: "Submit",
    tel: "",
    text: "",
    time: "12:00",
    url: "",
    week: `${new Date().getFullYear()}-W01`
};

/** SmartInputs remember their previous value. */
type SmartInput = HTMLInputElement & { prevValue:string };
/**
 * An InputAssemblyLine is a type of AssemblyLine specifically for
 * creating HTMLInputElements.
 * 
 * @param T 'type' field of the HTMLInputElement
 */
export class InputAssemblyLine<T extends keyof HTMLInputElementTypeMap> extends AssemblyLine<"input"> {

    private readonly type:T;

    constructor(type:T) {
        super("input");

        this.type = type;
        this._value = DEFAULT_VALUES[this.type];
    }

    protected _value:HTMLInputElementTypeMap[T];
    /** Provides the inputs 'value'. */
    public value(value:HTMLInputElementTypeMap[T]) {
        this._value = value;
        return this;
    }
    
    protected _name?:string;
    /** Provides the inputs 'name', to be used by forms. */
    public name(name:string) {
        this._name = name;
        return this;
    }

    protected _disabled?:boolean;
    /** Determines whether the input is non-interactive. */
    public disabled(disabled:boolean) {
        this._disabled = disabled;
        return this;
    }

    // disallow setting value through attribute
    public override attr(k: string, v?: { toString(): string; }): this {
        if (k === "value" || k === "onchange") return this;
        return super.attr(k,v);
    }
    public override attrs(attributes: Record<string, { toString(): string; }>): this {
        delete attributes.value;
        delete attributes.onchange;
        return super.attrs(attributes);
    }

    private _onValueChanged?:(curr:string, prev:string)=>void;
    /** Provides a callback function that is called just after the input value changes. */
    public onValueChanged(callback:(curr:string, prev:string)=>void) {
        this._onValueChanged = callback;
        return this;
    }

    public override make() {
        const out = super.make() as SmartInput;

        out.value = this._value.toString();
        out.prevValue = out.value;

        window.addEventListener("change", e => { // storing old value before value change
            if (e.target === out) out.prevValue = out.value;
        });

        if (this._onValueChanged) { // calling callback after value changed
            const valueCallback = this._onValueChanged;
            out.addEventListener("change", () => valueCallback(out.value, out.prevValue));
        }

        if (this._name !== undefined) out.name = this._name;
        if (this._disabled) out.disabled = true;

        return out;
    }

}

type ButtonLikeType = "button"|"reset"|"submit";
export class ButtonLikeInputAssemblyLine<BLT extends ButtonLikeType> extends InputAssemblyLine<BLT> {

    protected _onClick?:(val:string)=>void;
    /** Provides a callback function for when the button is clicked. */
    public onClick(callback:(val:string)=>void) {
        this._onClick = callback;
        return this;
    }

    public override make() {
        const out = super.make();
        if (this._onClick) { // calling callback when clicked
            const clickCallback = this._onClick; // move to local scope
            out.addEventListener("click", () => clickCallback(out.value));
        }

        return out;
    }

}

type CheckableInputType = "checkbox"|"radio";
type CheckableInputElement = SmartInput & { wasChecked:boolean };
export class CheckableInputAssemblyLine<CT extends CheckableInputType> extends InputAssemblyLine<CT> {

    constructor(type:CT) {
        super(type);
    }

    private _checked = false;
    /** Determines whether the checkbox starts out checked. */
    public checked(checked:boolean) {
        this._checked = checked;
        return this;
    }

    private _onCheckedChanged?:(curr:boolean, prev:boolean)=>void;
    /** Provides a callback for just after the input is (un)checked. */
    public onCheckedChanged(callback:(curr:boolean, prev:boolean)=>void) {
        this._onCheckedChanged = callback;
        return this;
    }

    public override make() {
        const out = super.make() as CheckableInputElement;

        out.checked = this._checked;
        out.wasChecked = out.checked;

        window.addEventListener("input", e => { // storing previous checked state just before change
            if (e.target === out) {
                if (out.wasChecked = out.checked) out.setAttribute("was-checked", "");
                else out.removeAttribute("was-checked");
            }
        });

        if (this._onCheckedChanged) { // calling callback when (un)checked just after change
            const checkCallback = this._onCheckedChanged;
            out.addEventListener("input", () => checkCallback(out.checked, out.wasChecked));
        }

        return out;
    }
}

type RangedInputType = "date"|"datetime-local"|"month"|"number"|"range"|"time";
export class RangedInputAssemblyLine<RT extends RangedInputType> extends InputAssemblyLine<RT> {

    constructor(type:RT) {
        super(type);
    }

    protected _min = this._value;
    /** Provides a minimum value for the input. */
    public min(minValue:HTMLInputElementTypeMap[RT]) {
        this._min = minValue;
        return this;
    }

    protected _max = this._value;
    /** Provides a maximum value for the input. */
    public max(minValue:HTMLInputElementTypeMap[RT]) {
        this._min = minValue;
        return this;
    }

    protected _step = 1;
    /** Defines the smallest amount the input value can change. */
    public step(step:number) {
        this._step = step;
        return this;
    }

    public override make() {
        const out = super.make();

        out.min = this._min.toString();
        out.max = this._max.toString();
        out.step = this._step.toString();

        return out;
    }

}

type NumberInputType = "number"|"range";
type NumberInput = SmartInput & { prevValueAsNumber:number };
export class NumberInputAssemblyLine<NT extends NumberInputType> extends RangedInputAssemblyLine<NT> {

    public override make() {
        const out = super.make() as NumberInput;

        out.prevValueAsNumber = Number.parseFloat(out.prevValue);

        window.addEventListener("change", e => {
            if (e.target === out) out.prevValueAsNumber = Number.parseFloat(out.prevValue);
        });

        return out;
    }

}

type DateInputType = "date"|"datetime-local";
type DateInput = SmartInput & { prevValueAsDate:Date };
export class DateInputAssemblyLine<DT extends DateInputType> extends RangedInputAssemblyLine<DT> {

    public override make() {
        const out = super.make() as DateInput;

        out.prevValueAsDate = new Date(out.prevValue);

        window.addEventListener("change", e => {
            if (e.target === out) out.prevValueAsDate = new Date(out.prevValue);
        });

        return out;
    }
    
}

type TextInputType = "email"|"file"|"hidden"|"password"|"search"|"tel"|"text"|"url";
export class TextInputAssemblyLine<TT extends TextInputType> extends InputAssemblyLine<TT> {

    constructor(type:TT) {
        super(type);
    }

    protected _list?:string;
    /** Provides the datalist (by id or reference) for suggestions on the input value. */
    public list(listId:string|HTMLDataListElement) {
        this._list = typeof listId === "string" ? listId : listId.id;
        return this;
    }

    protected _minLength?:number;
    /** Determines the minimum allowed length. */
    public minLength(bound:number) {
        this._minLength = Math.floor(bound);
        return this;
    }

    protected _maxLength?:number;
    /** Determines the maximum allowed length. */
    public maxLength(bound:number) {
        this._maxLength = Math.floor(bound);
        return this;
    }

    private _placeholder?:string;
    /** Provides a placeholder which is shown when the input is empty. */
    public placeholder(placeholder:string) {
        this._placeholder = placeholder;
        return this;
    }

    private _readonly?:boolean;
    /** Determines whether the text-like input accepts user-input. */
    public readonly(ro:boolean) {
        this._readonly = ro;
        return this;
    }

    private _size?:number;
    /** Provides the input width (in characters). */
    public size(size:number) {
        this._size = Math.floor(size);
        return this;
    }

    private _spellcheck?:boolean;
    /** Whether spellcheck is enabled. */
    public spellcheck(doSpellcheck:boolean) {
        this._spellcheck = doSpellcheck;
        return this;
    }

    public override make() {
        const out = super.make();
        if (this._list !== undefined) out.setAttribute("list", this._list);
        if (this._minLength !== undefined) out.minLength = this._minLength;
        if (this._maxLength !== undefined) out.maxLength = this._maxLength;
        if (this._placeholder) out.placeholder = this._placeholder;
        if (this._readonly) out.readOnly = this._readonly;
        if (this._size !== undefined) out.size = this._size;
        if (this._spellcheck) out.spellcheck = this._spellcheck;

        return out;
    }

}