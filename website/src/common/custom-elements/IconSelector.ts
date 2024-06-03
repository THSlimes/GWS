import ElementFactory from "../html-element-factory/ElementFactory";
import { HasValue } from "../util/UtilTypes";

export default class IconSelector<V extends string> extends HTMLElement implements HasValue<V> {

    private readonly options:[V, string][];
    private readonly optionElements:HTMLElement[];

    private _value:V;
    public get value() { return this._value; }
    public set value(newVal:V) {
        if (this._value !== newVal) {
            this.optionElements.forEach((e,i) => { // update selection indicator
                if (this.options[i][0] === newVal) e.setAttribute("selected", "");
                else e.removeAttribute("selected");
            });

            this._value = newVal;
            this.dispatchEvent(new Event("input"));
            this.dispatchEvent(new Event("change"));
        }
    }

    /**
     * Creates a  new IconSelector.
     * @param options [value, icon name, tooltip, selected] tuples
     */
    constructor(...options:[V, string, string?, boolean?][]) {
        super();

        if (options.length === 0) {
            this.classList.add("flex-columns", "cross-axis-center");
            this.options = [];
            this.optionElements = [];
            this._value = undefined as unknown as V;
        }
        else {
            if (options.map(o => o[0]).some((v,i,a) => a.indexOf(v) !== i)) {
                throw new Error(`duplicate value: ${options.map(o => o[0]).find((v,i,a) => a.indexOf(v) !== i)}`);
            }

            this.options = options.map(o => [o[0], o[1]]);
            this._value = (options.find(o => o[3]) ?? options[0])[0]; // select default

            // initialize element
            this.classList.add("flex-columns", "cross-axis-center");
            this.optionElements = options.map(o => ElementFactory.p(o[1])
                .class("icon", "option", "click-action")
                .attr("selected", this._value === o[0] ? "" : null)
                .tooltip(o[2] ?? null)
                .on("click", () => this.value = o[0])
                .make()
            );

            this.optionElements.forEach((e,i) => {
                this.appendChild(e);
                if (i !== this.optionElements.length-1) this.appendChild( // interlace with separators
                    ElementFactory.div(undefined, "separator").make()
                );
            });
        }
    }

    public addOption<AV extends string>(value:AV, icon:string, tooltip?:string, selected=false):IconSelector<V|AV> {
        const castVal = value as unknown as V;

        if (this.options.length !== 0) this.append(ElementFactory.div(undefined, "separator").make());
        this.options.push([castVal, icon]);
        this.optionElements.push(this.appendChild(
            ElementFactory.p(icon)
            .class("icon", "option", "click-action")
            .tooltip(tooltip ?? null)
            .on("click", () => this.value = castVal)
            .make()
        ));

        if (selected) {
            this.optionElements.forEach((e,i) => { // update selection indicator
                if (this.options[i][0] === castVal) e.setAttribute("selected", "");
                else e.removeAttribute("selected");
            });
            this._value = castVal;
        }

        return this as IconSelector<V|AV>;
    }

}

customElements.define("icon-selector", IconSelector);