import ElementFactory from "../html-element-factory/ElementFactory";

export default class Switch extends HTMLElement {

    private _value:boolean;
    public get value() { return this._value; }
    public set value(newVal:boolean) {
        if (newVal !== this._value) {
            this._value = newVal;
            newVal ? this.setAttribute("on", "") : this.removeAttribute("on");
            this.indicator.innerText = newVal ? "check" : "close";
            for (const dep of this.dependants) {
                if (newVal !== this.inverted) dep.removeAttribute("disabled");
                else dep.setAttribute("disabled","");
            }
        }
    }

    private readonly dependants:Element[] = [];
    private readonly inverted:boolean;

    private readonly indicator:HTMLHeadingElement;

    /**
     * Creates a new switch element.
     * @param initial initial state
     * @param dependants element that will be enabled/disabled based on the switch state
     * @param inverted whether to enable ```dependant``` when the switch is disabled and vice versa
     */
    constructor(initial=false, dependants?:string|Element|(string|Element)[], inverted=false) {
        super();

        this.inverted = inverted || this.hasAttribute("inverted");

        this.appendChild(ElementFactory.div(undefined, "knob").make());
        this.indicator = this.appendChild(ElementFactory.h4().class("icon", "indicator").make());
        
        dependants ??= this.getAttribute("dependants") ?? undefined;
        if (dependants) {
            if (!Array.isArray(dependants)) dependants = [dependants];
            dependants.forEach(dep => {
                if (typeof dep === "string") dep.split(',').map(id=>id.trim()).forEach(id => {
                    const e = document.getElementById(id);
                    if (e) this.dependants.push(e);
                });
                else this.dependants.push(dep);
            });
        }

        initial ||= this.hasAttribute("on"); // default to attribute
        [this.value, this._value] = [initial, initial];
        
        this.addEventListener("click", () => this.toggle());
    }

    public toggle():boolean {
        this.value = !this.value;
        return this.value;
    }

}

customElements.define("switch-input", Switch);