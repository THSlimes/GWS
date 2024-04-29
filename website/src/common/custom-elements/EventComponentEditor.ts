import { EventInfo } from "../firebase/database/events/EventDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import NumberUtil from "../util/NumberUtil";
import ObjectUtil from "../util/ObjectUtil";
import InfoComponentEditor from "./InfoComponentEditor";
import Switch from "./Switch";

interface NameComponentMap {
    color:EventInfo.Components.Color,
    registerable:EventInfo.Components.Registerable,
    registrationStart:EventInfo.Components.RegistrationStart,
    registrationEnd:EventInfo.Components.RegistrationEnd,
    cost:EventInfo.Components.Cost,
    form:EventInfo.Components.Form
}
type Name = keyof NameComponentMap;
type Component = NameComponentMap[Name];

export class EventComponentEditor extends InfoComponentEditor<EventInfo,Name,Component,NameComponentMap> {

    private static readonly creators:{[N in keyof NameComponentMap]: (info:EventInfo) => NameComponentMap[N]} = {
        color: () => new EventInfo.Components.Color("#FFFFFF"),
        cost: () => new EventInfo.Components.Cost(500),
        form: () => new EventInfo.Components.Form([]),
        registerable: () => new EventInfo.Components.Registerable({}),
        registrationStart: ev => new EventInfo.Components.RegistrationStart(new Date()),
        registrationEnd: ev => new EventInfo.Components.RegistrationEnd(ev.starts_at),
    };

    constructor(ev:EventInfo) {
        super(ev, ObjectUtil.keys(EventComponentEditor.creators));
    }

    protected override createComponent<N extends keyof NameComponentMap>(name:N): NameComponentMap[N] {
        return EventComponentEditor.creators[name](this.info);
    }
    protected override makeComponentEditor(ev:EventInfo, component:Component, canBeRemoved:boolean):HTMLElement {
        if (component instanceof EventInfo.Components.Color) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("palette").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.h4(component.translatedName).class("no-margin", "text-center"),
                            ElementFactory.input.color(component.bg)
                                .onValueChanged(newBG => component.bg = newBG as ColorUtil.HexColor)
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else if (component instanceof EventInfo.Components.Cost) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("euro_symbol").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.h4("Activiteit kost €").class("no-margin", "text-center"),
                            ElementFactory.input.number(undefined, .01, undefined, .01)
                                .disabled(ev.getComponent(EventInfo.Components.Registerable)!.numRegistrations !== 0)
                                .on("input", (_, self) => {
                                    try {
                                        const val = self.valueAsNumber;
                                        if (!Number.isNaN(val)) component.cost = Math.round(NumberUtil.clamp(val, .01) * 100);
                                    }
                                    catch { /* ignore */ }
                                })
                                .on("change", (_, self) => {
                                    try {
                                        const val = self.valueAsNumber;
                                        if (Number.isNaN(val)) self.valueAsNumber = .01;
                                        else component.cost = Math.round(NumberUtil.clamp(val, .01) * 100);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        self.valueAsNumber = .01;
                                    }
                                    finally { component.cost = Math.round(self.valueAsNumber * 100); }
                                })
                                .onMake(self => self.value = (component.cost * .01).toFixed(2))
                                .style({ width: "6em" })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else if (component instanceof EventInfo.Components.Registerable) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("how_to_reg").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "min-section-gap")
                        .children(
                            ElementFactory.h4(component.translatedName).class("no-margin", "text-center"),
                            ElementFactory.div(undefined, "capacity-editor", "no-margin", "flex-columns", "cross-axis-center", "in-section-gap")
                                .children(
                                    ElementFactory.h4('(').class("no-margin"),
                                    ElementFactory.h4("social_distance").class("icon"),
                                    ElementFactory.input.number(component.capacity ?? 999, component.numRegistrations, 999, 1)
                                        .on("input", (_, self) => {
                                            try {
                                                const val = self.valueAsNumber;
                                                if (!Number.isNaN(val)) self.valueAsNumber = NumberUtil.clamp(val, component.numRegistrations, 999);
                                            }
                                            catch { /* ignore */ }
                                        })
                                        .on("change", (_, self) => {
                                            try {
                                                const val = self.valueAsNumber;
                                                if (Number.isNaN(val)) self.value = self.max;
                                                else self.valueAsNumber = NumberUtil.clamp(val, component.numRegistrations, 999);
                                            }
                                            catch (e) {
                                                console.log(e);
                                                self.valueAsNumber = 999;
                                            }
                                            finally { component.capacity = self.valueAsNumber === 999 ? undefined : self.valueAsNumber; }
                                        })
                                        .style({ width: "5em" }),
                                    ElementFactory.h4(')').class("no-margin")
                                )
                                .tooltip("Maximaal aantal inschrijvingen")
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else if (component instanceof EventInfo.Components.RegistrationStart) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("line_start_square").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.h4("Inschrijven kan vanaf").class("no-margin", "text-center"),
                            ElementFactory.input.dateTimeLocal(component.moment)
                                .on("input", (_, self) => {
                                    try {
                                        const val = new Date(self.value);
                                        if (DateUtil.Timestamps.isValid(val)) component.moment = DateUtil.Timestamps.clamp(val, new Date(), ev.starts_at);
                                    }
                                    catch (e) { /* ignore */ }
                                })
                                .on("change", (_, self) => {
                                    try {
                                        let val = new Date(self.value);
                                        
                                        if (DateUtil.Timestamps.isValid(val)) val = DateUtil.Timestamps.clamp(val, new Date(), ev.starts_at);
                                        else val = component.moment;
                                        DateUtil.Timestamps.setInputValue(self, val);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        DateUtil.Timestamps.setInputValue(self, component.moment);
                                    }
                                    finally { component.moment = new Date(self.value); }
                                })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();

        }
        else if (component instanceof EventInfo.Components.RegistrationEnd) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("line_end_square").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.h4("Inschrijven kan tot en met").class("no-margin", "text-center"),
                            ElementFactory.input.dateTimeLocal(component.moment)
                                .on("input", (_, self) => {
                                    try {
                                        const val = new Date(self.value);
                                        const min = ev.getComponent(EventInfo.Components.RegistrationStart)?.moment ?? new Date();
                                        if (DateUtil.Timestamps.isValid(val)) component.moment = DateUtil.Timestamps.clamp(val, min, ev.starts_at);
                                    }
                                    catch (e) { /* ignore */ }
                                })
                                .on("change", (_, self) => {
                                    try {
                                        let val = new Date(self.value);
                                        const min = ev.getComponent(EventInfo.Components.RegistrationStart)?.moment ?? new Date();
                                        
                                        if (DateUtil.Timestamps.isValid(val)) val = DateUtil.Timestamps.clamp(val, min, ev.starts_at);
                                        else val = component.moment;
                                        DateUtil.Timestamps.setInputValue(self, val);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        DateUtil.Timestamps.setInputValue(self, component.moment);
                                    }
                                    finally { component.moment = new Date(self.value); }
                                })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else if (component instanceof EventInfo.Components.Form) {
            let inputTypeSelector:HTMLSelectElement;
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.h4("list_alt").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-rows", "center-content", "in-section-gap")
                        .children(
                            ...component.inputs.map(input => this.makeFormInputEditor(component, input)),
                            inputTypeSelector = ElementFactory.select<EventInfo.Components.Form.InputType>({ select: "Meerkeuze vraag", text: "Open vraag" })
                                .option('+', "variable_add", true).value('+')
                                .class("add-button")
                                .onValueChanged(opt => {
                                    if (opt !== '+') {
                                        inputTypeSelector.before(this.makeFormInputEditor(component, component.addInput(this.createFormInput(opt))));
                                        inputTypeSelector.value = '+';
                                    }
                                })
                                .make()
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen").class("no-padding") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else throw new Error(`no editor creator found for ${component}`);
    }

    private readonly formInputCreators:{[T in EventInfo.Components.Form.InputType]: () => EventInfo.Components.Form.InputOfType<T>} = {
        select: () => { return { type: "select", name: "", options: [], required: true } },
        text: () => { return { type: "text", name: "", maxLength: 256, required: true } }
    };

    private createFormInput<T extends EventInfo.Components.Form.InputType>(type:T):EventInfo.Components.Form.InputOfType<T> {
        return this.formInputCreators[type]();
    }

    private makeFormInputEditor(formComp:EventInfo.Components.Form, input:EventInfo.Components.Form.Input):HTMLElement {
        let out:HTMLElement;
        switch (input.type) {
            case "select":
                return out = ElementFactory.div(undefined, "input-editor", "flex-columns", "main-axis-space-between", 'cross-axis-center', "in-section-gap")
                .children(
                    ElementFactory.input.text(input.name)
                    .placeholder("Vraag...")
                    .maxLength(256)
                    .onValueChanged(val => input.name = val),
                    ElementFactory.textarea(input.options.join(", "))
                    .attr("no-resize")
                    .placeholder(`Opties gescheiden door komma's... (bijvoorbeeld "cola, bier")`)
                    .rows(1)
                    .style({ flexGrow: '1' })
                    .on("input", (_, self) => input.options = self.value.split(',').map(o => o.trim()).filter(o => o.length !== 0)),
                    ElementFactory.label("Verplicht"),
                    ElementFactory.input.switch(input.required)
                    .on("input", (_, self) => input.required = self.value ),
                    ElementFactory.iconButton("remove", () => {
                        formComp.removeInput(input);
                        out.remove();
                    }, "Vraag verwijderen")
                )
                .make();
            case "text":
                return out = ElementFactory.div(undefined, "input-editor", "flex-columns", "main-axis-space-between", 'cross-axis-center', "in-section-gap")
                .children(
                    ElementFactory.input.text(input.name)
                    .placeholder("Vraag...")
                    .maxLength(256)
                    .style({ flexGrow: '1' })
                    .onValueChanged(val => input.name = val),
                    ElementFactory.label("Max. aantal tekens"),
                    ElementFactory.input.number(input.maxLength, 0, 256, 1)
                    .style({ width: "5em" })
                    .on("input", (_, self) => {
                        const val = self.valueAsNumber;
                        if (!Number.isNaN(val)) input.maxLength = NumberUtil.clamp(val, 1, 256);
                    })
                    .on("change", (_, self) => {
                        let val = self.valueAsNumber;
                        if (Number.isNaN(val)) val = 256;
                        else val = NumberUtil.clamp(val, 1, 256);
                        self.valueAsNumber = input.maxLength = val;
                    }),
                    ElementFactory.label("Verplicht"),
                    ElementFactory.input.switch(input.required)
                    .on("input", (_, self) => input.required = self.value ),
                    ElementFactory.iconButton("remove", () => {
                        formComp.removeInput(input);
                        out.remove();
                    }, "Vraag verwijderen")
                )
                .make();
        }
    }

}

customElements.define("event-component-editor", EventComponentEditor);