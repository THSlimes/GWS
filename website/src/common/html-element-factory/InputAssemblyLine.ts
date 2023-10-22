import AssemblyLine, { HexColor } from "./AssemblyLine";

/** Maps the 'type' field of an HTMLInputElement to the type of its 'value' field */
type HTMLInputElementTypeMap = {
    "button": [string];
    "checkbox": [string];
    "color": [number, number, number];
    "date": [number, number, number];
    "datetime-local": [number, number, number, number, number] | [Date];
    "email": [string];
    "file": [string];
    "hidden": [string];
    "image": [];
    "month": [number, number];
    "number": [number];
    "password": [string];
    "radio": [string];
    "range": [number];
    "reset": [string];
    "search": [string];
    "submit": [string];
    "tel": [string];
    "text": [string];
    "time": [number, number];
    "url": [string];
    "week": [number, number];
};
/** Default values for each input type.  */
type InputTypeTranslators = {
    [K in keyof HTMLInputElementTypeMap]: (...args:HTMLInputElementTypeMap[K]) => string
};

const INPUT_TYPE_TRANSLATORS:InputTypeTranslators = {
    button: text => text,
    checkbox: value => value,
    color: (r,g,b) => `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`,
    date: (...args) => {
        return `${args[0].toString().padStart(4,'0')}-${args[1].toString().padStart(4,'0')}-${args[2].toString().padStart(4,'0')}`;
    },
    "datetime-local": (...args) => {
        if (args[0] instanceof Date) return args[0].toISOString();
        else return new Date(args[0], args[1]!, args[2]!, args[3]!, args[4]!).toISOString();
    },
    email: email => email,
    file: path => path,
    hidden: value => value,
    image: () => "",
    month: (year, month) => `${year.toString().padStart(4,'0')}-${(month+1).toString().padStart(2,'0')}`,
    number: num => num.toString(),
    password: password => password,
    radio: value => value,
    range: num => num.toString(),
    reset: text => text,
    search: query => query,
    submit: text => text,
    tel: telNumber => telNumber,
    text: text => text,
    time: (hrs, min) => `${hrs.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`,
    url: url => url,
    week: (year, weekInd) => `${year.toString().padStart(4,'0')}-W${year.toString().padStart(2,'0')}`
};

/** SmartInputs remember their previous value. */
type SmartInput = HTMLInputElement & { prevValue: string; };
/**
 * An InputAssemblyLine is a type of AssemblyLine specifically for
 * creating HTMLInputElements.
 *
 * @param T 'type' field of the HTMLInputElement
 */
export class InputAssemblyLine<T extends keyof HTMLInputElementTypeMap> extends AssemblyLine<"input"> {

    protected readonly type: T;

    constructor(type: T) {
        super("input");

        this.type = type;
    }

    protected _value?: HTMLInputElementTypeMap[T];
    /** Provides the inputs 'value'. */
    public value(...value: HTMLInputElementTypeMap[T]) {
        this._value = value;
        return this;
    }

    protected _name?: string;
    /** Provides the inputs 'name', to be used by forms. */
    public name(name: string) {
        this._name = name;
        return this;
    }

    protected _disabled?: boolean;
    /** Determines whether the input is non-interactive. */
    public disabled(disabled: boolean) {
        this._disabled = disabled;
        return this;
    }

    // disallow setting value through attribute
    public override attr(k: string, v?: { toString(): string; }): this {
        if (k === "value" || k === "onchange") return this;
        return super.attr(k, v);
    }
    public override attrs(attributes: Record<string, { toString(): string; }>): this {
        delete attributes.value;
        delete attributes.onchange;
        return super.attrs(attributes);
    }

    private _onValueChanged?: (curr: string, prev: string) => void;
    /** Provides a callback function that is called just after the input value changes. */
    public onValueChanged(callback: (curr: string, prev: string) => void) {
        this._onValueChanged = callback;
        return this;
    }

    public override make() {
        const out = super.make() as SmartInput;
        out.type = this.type;

        if (this._value !== undefined) out.value = INPUT_TYPE_TRANSLATORS[this.type](...this._value);
        out.prevValue = out.value;

        window.addEventListener("change", e => {
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
type ButtonLikeType = "button" | "reset" | "submit";
export class ButtonLikeInputAssemblyLine<BLT extends ButtonLikeType> extends InputAssemblyLine<BLT> {

    protected _onClick?: (val: string) => void;
    /** Provides a callback function for when the button is clicked. */
    public onClick(callback: (val: string) => void) {
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
type CheckableInputType = "checkbox" | "radio";
type CheckableInputElement = SmartInput & { wasChecked: boolean; };
export class CheckableInputAssemblyLine<CT extends CheckableInputType> extends InputAssemblyLine<CT> {

    constructor(type: CT) {
        super(type);
    }

    private _checked = false;
    /** Determines whether the checkbox starts out checked. */
    public checked(checked: boolean) {
        this._checked = checked;
        return this;
    }

    private _onCheckedChanged?: (curr: boolean, prev: boolean) => void;
    /** Provides a callback for just after the input is (un)checked. */
    public onCheckedChanged(callback: (curr: boolean, prev: boolean) => void) {
        this._onCheckedChanged = callback;
        return this;
    }

    public override make() {
        const out = super.make() as CheckableInputElement;

        out.checked = this._checked;
        out.wasChecked = out.checked;

        window.addEventListener("input", e => {
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
type RangedInputType = "date" | "datetime-local" | "month" | "number" | "range" | "time";
export class RangedInputAssemblyLine<RT extends RangedInputType> extends InputAssemblyLine<RT> {

    constructor(type: RT) {
        super(type);
    }

    protected _min?: HTMLInputElementTypeMap[RT];
    /** Provides a minimum value for the input. */
    public min(minValue: HTMLInputElementTypeMap[RT]) {
        this._min = minValue;
        return this;
    }

    protected _max?: HTMLInputElementTypeMap[RT];
    /** Provides a maximum value for the input. */
    public max(minValue: HTMLInputElementTypeMap[RT]) {
        this._min = minValue;
        return this;
    }

    protected _step = 1;
    /** Defines the smallest amount the input value can change. */
    public step(step: number) {
        this._step = step;
        return this;
    }

    public override make() {
        const out = super.make();

        if (this._min !== undefined) out.min = INPUT_TYPE_TRANSLATORS[this.type](...this._min);
        if (this._max !== undefined) out.max = INPUT_TYPE_TRANSLATORS[this.type](...this._max);
        out.step = this._step.toString();

        return out;
    }

}
type NumberInputType = "number" | "range";
type NumberInput = SmartInput & { prevValueAsNumber: number; };
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
type DateInputType = "date" | "datetime-local";
type DateInput = SmartInput & { prevValueAsDate: Date; };
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
type TextInputType = "email" | "file" | "hidden" | "password" | "search" | "tel" | "text" | "url";
export class TextInputAssemblyLine<TT extends TextInputType> extends InputAssemblyLine<TT> {

    constructor(type: TT) {
        super(type);
    }

    protected _list?: string;
    /** Provides the datalist (by id or reference) for suggestions on the input value. */
    public list(listId: string | HTMLDataListElement) {
        this._list = typeof listId === "string" ? listId : listId.id;
        return this;
    }

    protected _minLength?: number;
    /** Determines the minimum allowed length. */
    public minLength(bound: number) {
        this._minLength = Math.floor(bound);
        return this;
    }

    protected _maxLength?: number;
    /** Determines the maximum allowed length. */
    public maxLength(bound: number) {
        this._maxLength = Math.floor(bound);
        return this;
    }

    private _placeholder?: string;
    /** Provides a placeholder which is shown when the input is empty. */
    public placeholder(placeholder: string) {
        this._placeholder = placeholder;
        return this;
    }

    private _readonly?: boolean;
    /** Determines whether the text-like input accepts user-input. */
    public readonly(ro: boolean) {
        this._readonly = ro;
        return this;
    }

    private _size?: number;
    /** Provides the input width (in characters). */
    public size(size: number) {
        this._size = Math.floor(size);
        return this;
    }

    private _spellcheck?: boolean;
    /** Whether spellcheck is enabled. */
    public spellcheck(doSpellcheck: boolean) {
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
