import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import AssemblyLine from "./AssemblyLine";

/** SmartInputs remember their previous value. */
type SmartInput = HTMLInputElement & { prevValue: string };
namespace SmartInput {
    /** Maps the 'type' field of an HTMLInputElement to the type of its 'value' field */
    export type InputTypeMap = {
        "button": [string];
        "checkbox": [string];
        "color": [number, number, number] | [ColorUtil.HexColor];
        "date": [number, number, number] | [Date];
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

    interface ValueTranslator<T extends keyof InputTypeMap> {
        fromString: (v: string) => InputTypeMap[T],
        toString: (...v: InputTypeMap[T]) => string
    }

    const VALUE_TRANSLATORS: { [T in keyof InputTypeMap]: ValueTranslator<T> } = {
        button: { fromString: v => [v], toString: v => v },
        checkbox: { fromString: v => [v], toString: v => v },
        color: {
            fromString: v => ColorUtil.toRGB(v as ColorUtil.HexColor),
            toString: (...v) => v.length === 1 ?
                v[0] :
                `#${v.map(c => c.toString(16).padStart(2, '0')).join("")}`
        },
        date: {
            fromString(v) {
                const [year, month, day] = v.split('-')
                    .map(Number);
                return [new Date(year, month - 1, day)];
            },
            toString(...v) {
                const [year, monthInd, date] = v.length === 1 ?
                    [v[0].getFullYear(), v[0].getMonth(), v[0].getDate()] :
                    v;

                return `${year.toString().padStart(4, '0')}-${(monthInd + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
            }
        },
        "datetime-local": {
            fromString: v => [new Date(v)],
            toString(...v) {
                let iso: string;
                if (v.length === 1) {
                    const date = DateUtil.Timestamps.copy(v[0]);
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    iso = date.toISOString();
                }
                else iso = new Date(...v).toISOString();

                return iso.includes('.') ?
                    iso.substring(0, iso.lastIndexOf('.')) :
                    iso;
            },
        },
        email: { fromString: v => [v], toString: v => v },
        file: { fromString: v => [v], toString: v => v },
        hidden: { fromString: v => [v], toString: v => v },
        image: { fromString: v => [], toString: () => "" },
        month: {
            fromString(v) {
                const [y, mi] = v.split('-')
                    .map(Number);
                return [y, mi + 1];
            },
            toString: (y, mi) => `${y.toString().padStart(4, '0')}-${(mi + 1).toString().padStart(2, '0')}`
        },
        number: { fromString: v => [Number.parseFloat(v)], toString: v => v.toString() },
        password: { fromString: v => [v], toString: v => v },
        radio: { fromString: v => [v], toString: v => v },
        range: { fromString: v => [Number.parseFloat(v)], toString: v => v.toString() },
        reset: { fromString: v => [v], toString: v => v },
        search: { fromString: v => [v], toString: v => v },
        submit: { fromString: v => [v], toString: v => v },
        tel: { fromString: v => [v], toString: v => v },
        text: { fromString: v => [v], toString: v => v },
        time: {
            fromString(v) {
                const [hrs, min] = v.split(':')
                    .map(Number);
                return [hrs, min];
            },
            toString: (...v) => v.map(p => p.toString().padStart(2, '0'))
                .join(':')
        },
        url: { fromString: v => [v], toString: v => v },
        week: {
            fromString(v) {
                const [year, week] = v.split("-W")
                    .map(Number);
                return [week, year];
            },
            toString: (year, week) => `${year.toString().padStart(4, '0')}-W${week.toString().padStart(2, '0')}`
        }
    };

    export function translateValueToString<T extends keyof InputTypeMap>(type: T, ...val: InputTypeMap[T]): string {
        return VALUE_TRANSLATORS[type].toString(...val);
    }

    export function translateStringToValue<T extends keyof InputTypeMap>(type: T, str: string): InputTypeMap[T] {
        return VALUE_TRANSLATORS[type].fromString(str);
    }
}

/**
 * An InputAssemblyLine is a type of AssemblyLine specifically for
 * creating HTMLInputElements.
 *
 * @param T 'type' field of the HTMLInputElement
 */
export class InputAssemblyLine<T extends keyof SmartInput.InputTypeMap> extends AssemblyLine<"input"> {

    protected readonly type: T;

    constructor(type: T) {
        super("input");

        this.type = type;
    }

    protected _value?: SmartInput.InputTypeMap[T];
    /** Provides the inputs 'value'. */
    public value(...value: SmartInput.InputTypeMap[T]) {
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

    private _autocomplete: "on" | "off" | AutoFill = "off";
    public autocomplete(tokens: "on" | "off" | AutoFill) {
        this._autocomplete = tokens;
        return this;
    }

    private validationPredicate?: (...value: SmartInput.InputTypeMap[T]) => boolean | string;
    public validateValue(predicate: (...value: SmartInput.InputTypeMap[T]) => boolean | string) {
        this.validationPredicate = predicate;
        return this;
    }

    public override make() {
        const out = super.make() as SmartInput;
        out.type = this.type;

        if (this._value !== undefined) {
            const v = SmartInput.translateValueToString(this.type, ...this._value);
            out.value = v;
        }
        out.prevValue = out.value;

        window.addEventListener("input", e => {
            if (e.target === out) out.prevValue = out.value;
        });

        if (this._onValueChanged) { // calling callback after value changed
            const valueCallback = this._onValueChanged;
            out.addEventListener("input", () => valueCallback(out.value, out.prevValue));
        }

        out.autocomplete = this._autocomplete;

        if (this.validationPredicate) {
            const pred = this.validationPredicate;
            const validateCB = () => {
                const validity = pred(...SmartInput.translateStringToValue(this.type, out.value));
                if (typeof validity === "string") out.setAttribute("invalid", validity);
                else out.toggleAttribute("invalid", !validity);
            }
            out.addEventListener("input", validateCB);
            out.addEventListener("change", validateCB);
            validateCB();
        }

        if (this._name !== undefined) out.name = this._name;
        if (this._disabled) out.disabled = true;

        return out;
    }

}



export class ButtonLikeInputAssemblyLine<BLT extends ButtonLikeInputAssemblyLine.InputType> extends InputAssemblyLine<BLT> {

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
export namespace ButtonLikeInputAssemblyLine {
    export type InputType = "button" | "reset" | "submit";
}



export class CheckableInputAssemblyLine<CT extends CheckableInputAssemblyLine.InputType> extends InputAssemblyLine<CT> {

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
        const out = super.make() as CheckableInputAssemblyLine.CheckableInputElement;

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

namespace CheckableInputAssemblyLine {
    export type InputType = "checkbox" | "radio";
    export type CheckableInputElement = SmartInput & { wasChecked: boolean; };
}



export class RangedInputAssemblyLine<RT extends RangedInputAssemblyLine.InputType> extends InputAssemblyLine<RT> {

    constructor(type: RT) {
        super(type);
    }

    protected _min?: SmartInput.InputTypeMap[RT];
    /** Provides a minimum value for the input. */
    public min(...minValue: SmartInput.InputTypeMap[RT]) {
        this._min = minValue;
        return this;
    }

    protected _max?: SmartInput.InputTypeMap[RT];
    /** Provides a maximum value for the input. */
    public max(...maxValue: SmartInput.InputTypeMap[RT]) {
        this._max = maxValue;
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

        if (this._min !== undefined) out.min = SmartInput.translateValueToString(this.type, ...this._min);
        if (this._max !== undefined) out.max = SmartInput.translateValueToString(this.type, ...this._max);
        out.step = this._step.toString();

        return out;
    }

}

namespace RangedInputAssemblyLine {
    export type InputType = "date" | "datetime-local" | "month" | "number" | "range" | "time" | "week";
}



export class NumberInputAssemblyLine<NT extends NumberInputAssemblyLine.InputType> extends RangedInputAssemblyLine<NT> {

    public override make() {
        const out = super.make() as NumberInputAssemblyLine.NumberInput;

        out.prevValueAsNumber = Number.parseFloat(out.prevValue);

        window.addEventListener("change", e => {
            if (e.target === out) out.prevValueAsNumber = Number.parseFloat(out.prevValue);
        });

        return out;
    }

}

namespace NumberInputAssemblyLine {
    export type InputType = "number" | "range";
    export type NumberInput = SmartInput & { prevValueAsNumber: number; };
}



export class DateInputAssemblyLine<DT extends DateInputAssemblyLine.InputType> extends RangedInputAssemblyLine<DT> {

    public override make() {
        const out = super.make() as DateInputAssemblyLine.DateInput;

        out.prevValueAsDate = new Date(out.prevValue);

        window.addEventListener("change", e => {
            if (e.target === out) out.prevValueAsDate = new Date(out.prevValue);
        });

        return out;
    }

}

namespace DateInputAssemblyLine {
    export type InputType = "date" | "datetime-local" | "month" | "week";
    export type DateInput = SmartInput & { prevValueAsDate: Date; };
}



export class TextInputAssemblyLine<TT extends TextInputAssemblyLine.InputType> extends InputAssemblyLine<TT> {

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

namespace TextInputAssemblyLine {
    export type InputType = "email" | "file" | "hidden" | "password" | "search" | "tel" | "text" | "url";
}