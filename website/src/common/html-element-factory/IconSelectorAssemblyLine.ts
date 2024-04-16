import IconSelector from "../custom-elements/IconSelector";
import AssemblyLine from "./AssemblyLine";

export default class IconSelectorAssemblyLine<V extends string> extends AssemblyLine<"icon-selector",IconSelector<V>> {

    constructor() {
        super("icon-selector", () => new IconSelector<V>());
    }

    protected readonly _options:[V, string, string?,boolean?][] = [];
    public options(...options:[V,string,string?,boolean?][]):this {
        this._options.push(...options);
        const selected = options.find(opt => opt[3]);
        
        return this;
    }

    protected _value?:V;
    public value(val:V):this {
        this._value = val;
        return this;
    }

    public override make():IconSelector<V> {
        let out = super.make();
        for (const opt of this._options) out = out.addOption(...opt);

        if (this._value !== undefined) out.value = this._value;

        return out;
    }

}