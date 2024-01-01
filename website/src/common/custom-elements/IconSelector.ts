import ElementFactory from "../html-element-factory/ElementFactory";

export default class IconSelector<V extends string> extends HTMLElement {

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

    constructor(...options:[V, string, boolean?][]) {
        super();
        if (options.map(o => o[0]).some((v,i,a) => a.indexOf(v) !== i)) {
            throw new Error(`duplicate value: ${options.map(o => o[0]).find((v,i,a) => a.indexOf(v) !== i)}`);
        }

        this.options = options.map(o => [o[0], o[1]]);
        this._value = (options.find(o => o[2]) ?? options[0])[0];

        // initialize element
        this.classList.add("flex-columns", "cross-axis-center");
        this.optionElements = options.map(o => ElementFactory.p(o[1])
            .class("icon", "option", "click-action")
            .attr("selected", this._value === o[0] ? "" : null)
            .on("click", () => this.value = o[0])
            .make()
        );

        this.optionElements.forEach((e,i) => {
            this.appendChild(e);
            if (i !== this.optionElements.length-1) this.appendChild(
                ElementFactory.p('│').class("separator").make()
            );
        });
    }

}

customElements.define("icon-selector", IconSelector);