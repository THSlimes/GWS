import ElementFactory from "../html-element-factory/ElementFactory";
import ObjectUtil from "../util/ObjectUtil";
import { HasSections } from "../util/UtilTypes";

export default class OptionCollection<Option extends string, OptionTypeMap extends Record<Option,any>> extends HTMLElement implements HasSections<"selector"> {

    private readonly optionInputs;
    private readonly optionNames:Record<Option,string>;
    private readonly activeOptions = new Set<Option>();
    private readonly hiddenOptions = new Set<Option>();

    public selector!:HTMLSelectElement & { value:Option|'+' };
    private refreshSelector() {
        const options = Array.from(this.selector.options);
        options.forEach(option => option.hidden = option.value === '+' || this.hiddenOptions.has(option.value as Option) || this.has(option.value as Option));
        this.selector.hidden = options.every(option => option.hidden);
    }

    private readonly activeOptionsChangeHandlers:VoidFunction[] = [];
    public set onActiveOptionsChanged(handler:VoidFunction) {
        if (!this.activeOptionsChangeHandlers.includes(handler)) this.activeOptionsChangeHandlers.push(handler);
    }

    constructor(optionInputs:OptionCollection.Inputs<Option,OptionTypeMap>, optionNames?:Record<Option,string>) {
        super();

        this.optionInputs = optionInputs;
        this.optionNames = optionNames ?? ObjectUtil.mapToObject(ObjectUtil.keys(optionInputs), optName => optName);

        this.initElement();
    }

    public initElement():void {
        this.classList.add("flex-rows", "cross-axis-center", "in-section-gap");

        this.selector = this.appendChild(
            ElementFactory.select(this.optionNames)
            .option('+', "variable_add", true).value('+')
                .class("button")
                .attr("no-select")
                .onValueChanged(val => {
                    if (val !== '+') {
                        this.add(val);
                        this.selector.value = '+';
                    }
                })
                .tooltip("Instelling toevoegen")
                .make()
        );
    }

    public add<O extends Option>(optionName:O) {
        if (!this.has(optionName)) {
            const insElem = ElementFactory.div(undefined, "option", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.p(this.optionInputs[optionName][0]).class("icon"),
                    this.optionInputs[optionName][1],
                    ElementFactory.iconButton("remove", () => this.delete(optionName), "Instelling weghalen")
                )
                .make();
            if (this.lastChild) this.lastChild.before(insElem);
            else this.appendChild(insElem);
            this.activeOptions.add(optionName);
            
            this.refreshSelector();
            for (const handler of this.activeOptionsChangeHandlers) handler();
        }
    }

    public delete(optionName:Option):boolean {
        if (this.activeOptions.has(optionName)) {
            this.optionInputs[optionName][1].parentElement!.remove();
            this.activeOptions.delete(optionName);

            this.refreshSelector();
            for (const handler of this.activeOptionsChangeHandlers) handler();

            return true;
        }
        else return false;
    }

    public hide(optionName:Option) {
        if (!this.hiddenOptions.has(optionName)) {
            this.hiddenOptions.add(optionName);
            this.refreshSelector();
        }
    }

    public has(optionName:Option) {
        return this.activeOptions.has(optionName);
    }

    public getAll():Partial<OptionTypeMap> {
        const out:Partial<OptionTypeMap> = {};
        for (const optName of this.activeOptions) out[optName] = this.get(optName);

        return out;
    }

    public get<O extends Option>(optionName:O):OptionTypeMap[O]|undefined {
        if (this.activeOptions.has(optionName)) {
            const [icon, elem, getter] = this.optionInputs[optionName];
            return getter(elem);
        }
    }

    public combine<OthOpt extends string, OthOptTypeMap extends Record<OthOpt,any>>(other:OptionCollection<OthOpt,OthOptTypeMap>) {
        // combine inputs
        const combInputs:OptionCollection.Inputs<Option|OthOpt,OptionTypeMap&OthOptTypeMap> = {
            ...this.optionInputs, ...other.optionInputs
        } as OptionCollection.Inputs<Option|OthOpt,OptionTypeMap&OthOptTypeMap>;

        // combine names
        const combNames = {...this.optionNames, ...other.optionNames};

        const out = new OptionCollection(combInputs, combNames);

        // set active options
        for (const optName of this.activeOptions) out.add(optName);
        for (const optName of other.activeOptions) out.add(optName);
        
        // set hidden options
        for (const optName of this.hiddenOptions) out.hide(optName);
        for (const optName of other.hiddenOptions) out.hide(optName);

        // copy event handler
        out.onActiveOptionsChanged = () => {
            this.activeOptions.clear();
            for (const optionName of out.activeOptions) {
                if (optionName in this.optionInputs) this.activeOptions.add(optionName as Option);
            }
            other.activeOptions.clear();
            for (const optionName of out.activeOptions) {
                if (optionName in other.optionInputs) other.activeOptions.add(optionName as OthOpt);
            }
        };
        for (const handler of this.activeOptionsChangeHandlers) out.onActiveOptionsChanged = handler;
        for (const handler of other.activeOptionsChangeHandlers) out.onActiveOptionsChanged = handler;

        return out;
    }

}

namespace OptionCollection {
    export type Inputs<Option extends string, OptionTypeMap extends Record<Option,any>> = {[O in Option]: [string, Element, (elem:Element)=>OptionTypeMap[O]]};
}

customElements.define("option-collection", OptionCollection);