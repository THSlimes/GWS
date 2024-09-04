import ColorPicker from "../custom-elements/ColorPicker";
import ColorUtil from "../util/ColorUtil";
import AssemblyLine from "./AssemblyLine";

export default class ColorPickerAssemblyLine extends AssemblyLine<"color-picker", ColorPicker> {

    constructor() {
        super("color-picker", () => new ColorPicker());
    }

    protected _value?: ColorUtil.HexColor;
    public value(value: ColorUtil.HexColor): this {
        this._value = value;
        return this;
    }

    public override make(): ColorPicker {
        const out = super.make();

        if (this._value !== undefined) out.value = this._value;

        return out;
    }

}