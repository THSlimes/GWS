import { Info } from "../firebase/database/Database";
import ElementFactory from "../html-element-factory/ElementFactory";
import NodeUtil from "../util/NodeUtil";
import ObjectUtil from "../util/ObjectUtil";
import { HasSections } from "../util/UtilTypes";

export default abstract class InfoComponentEditor<I extends Info, Name extends string, Component extends Info.Component<I>, NCMap extends Record<Name,Component>> extends HTMLElement implements HasSections<"componentEditors"|"selector"> {

    protected readonly info:I;
    
    private readonly allNames:Name[];

    public componentEditors!:HTMLDivElement;
    public selector!:HTMLSelectElement & { value:Name|'+' };

    constructor(info:I, allNames:Name[]) {
        super();
        

        this.info = info;
        this.allNames = allNames;

        this.initElement();
    }

    initElement():void {
        this.classList.add("info-component-editor", "flex-rows", "cross-axis-center", "in-section-gap");

        this.componentEditors = this.appendChild(
            ElementFactory.div(undefined, "component-editors", "flex-rows", "in-section-gap")
                .children(...this.info.components.map(comp => this.makeComponentEditor(this.info, comp as Component, comp.canBeRemovedFrom(this.info))))
                .make()
        );

        this.selector = this.appendChild(
            ElementFactory.select(ObjectUtil.mapToObject(this.allNames, n => {
                const comp = this.createComponent(n);
                return [comp.translatedName, !comp.canBeAddedTo(this.info)] as [string,boolean];
            }))
            .option('+', "variable_add", true).value('+')
            .class("add-button")
            .onValueChanged(newCompName => {
                if (newCompName !== '+') {
                    this.addComponent(newCompName, this.createComponent(newCompName));
                    this.selector.value = '+';
                }
            })
            .tooltip("Instelling toevoegen")
            .make()
        );
    }

    private refresh() {
        NodeUtil.empty(this.componentEditors);
        this.componentEditors.append(...this.info.components.map(comp => this.makeComponentEditor(this.info, comp as Component, comp.canBeRemovedFrom(this.info))));

        const options = Array.from(this.selector.options)
        options.forEach(opt => {
            opt.hidden = opt.value === '+' || !this.createComponent(opt.value as Name).canBeAddedTo(this.info);
        });
        this.selector.hidden = options.every(opt => opt.hidden);
    }

    protected abstract createComponent<N extends Name>(name:N):NCMap[N];

    protected abstract makeComponentEditor(info:I, component:Component, canBeRemoved:boolean):HTMLElement;

    public addComponent<N extends Name>(name:N, component:NCMap[N]=this.createComponent(name)) {
        if (!component.canBeAddedTo(this.info)) throw new Error(`${name} component cannot be added to info object`);

        this.info.components.push(component);
        this.componentEditors.appendChild(this.makeComponentEditor(this.info, component, component.canBeRemovedFrom(this.info)));
        this.refresh();

        this.dispatchEvent(new Event("input"));
        this.dispatchEvent(new Event("change"));
    }

    public removeComponent(component:Component) {
        const index = this.info.components.indexOf(component);
        if (index === -1) throw new Error("given component is part of info object");
        
        this.info.components.splice(index, 1);
        this.refresh();

        this.dispatchEvent(new Event("input"));
        this.dispatchEvent(new Event("change"));
    }
    
}