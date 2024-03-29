import ElementFactory from "../html-element-factory/ElementFactory";
import Loading from "../Loading";
import ElementUtil from "../util/ElementUtil";
import { HasSections } from "../util/UtilTypes";

export default class Switch extends HTMLElement implements HasSections<"indicator"> {

    private _value!:boolean;
    public get value() { return this._value; }
    public set value(newVal:boolean) {
        if (newVal !== this._value) {
            this._value = newVal;
            newVal ? this.setAttribute("on", "") : this.removeAttribute("on");
            if (this.indicator) this.indicator.textContent = newVal ? "check" : "close";
            for (const dep of this.dependants) {
                if (newVal !== this.inverted) Switch.removeDisabler(dep);
                else Switch.addDisabler(dep);
            }

            this.dispatchEvent(new InputEvent("input", { bubbles: true }));
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    public get disabled() {
        return this.hasAttribute("disabled");
    }
    public set disabled(isDisabled:boolean) {
        this.toggleAttribute("disabled", isDisabled);
    }

    private static addDisabler(elem:Element) {
        const oldLevel = elem.hasAttribute("disabled") ? ElementUtil.getAttrAsNumber(elem, "disabled", false) ?? 1 : 0;
        elem.setAttribute("disabled", (oldLevel + 1).toString());
    }
    private static removeDisabler(elem:Element) {
        const oldLevel = elem.hasAttribute("disabled") ? ElementUtil.getAttrAsNumber(elem, "disabled", false) ?? 1 : 0;
        const newLevel = oldLevel - 1;
        if (newLevel <= 0) elem.removeAttribute("disabled");
        else elem.setAttribute("disabled", newLevel.toString());
    }

    public readonly dependants:Element[] = [];
    private readonly inverted:boolean;

    public indicator!:HTMLHeadingElement;

    /**
     * Creates a new switch element.
     * @param initial initial state
     * @param dependants element that will be enabled/disabled based on the switch state
     * @param inverted whether to enable ```dependant``` when the switch is disabled and vice versa
     */
    constructor(initial=false, dependants?:string|Element|(string|Element)[], inverted=false) {
        super();

        this.inverted = inverted || this.hasAttribute("inverted");
        
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

        this.initElement();
    }

    initElement(): void {
        this.appendChild(ElementFactory.div(undefined, "knob", "click-action").make());
        this.indicator = this.appendChild(ElementFactory.h4(this._value ? "check" : "close").class("icon", "indicator").make());
        
        this.addEventListener("click", () => this.toggle());
    }

    public toggle():boolean {
        this.value = !this.value;
        return this.value;
    }

}

Loading.onDOMContentLoaded().then(() => customElements.define("switch-input", Switch));