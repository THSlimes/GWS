import { EventInfo } from "../firebase/database/events/EventDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import NumberUtil from "../util/NumberUtil";
import InfoComponentEditor from "./InfoComponentEditor";

interface NameComponentMap {
    color:EventInfo.Components.Color,
    registerable:EventInfo.Components.Registerable,
    registrationStart:EventInfo.Components.RegistrationStart,
    registrationEnd:EventInfo.Components.RegistrationEnd,
    cost:EventInfo.Components.Cost
}
type Name = keyof NameComponentMap;
type Component = NameComponentMap[Name];

export class EventComponentEditor extends InfoComponentEditor<EventInfo,Name,Component,NameComponentMap> {

    private static readonly creators:{[N in keyof NameComponentMap]: (info:EventInfo) => NameComponentMap[N]} = {
        color: () => new EventInfo.Components.Color("#FFFFFF"),
        registerable: () => new EventInfo.Components.Registerable({}),
        registrationStart: ev => new EventInfo.Components.RegistrationStart(new Date()),
        registrationEnd: ev => new EventInfo.Components.RegistrationEnd(ev.starts_at),
        cost: () => new EventInfo.Components.Cost(500)
    };

    constructor(ev:EventInfo) {
        super(ev, ["color", "cost", "registerable", "registrationStart", "registrationEnd"]);
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
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen") :
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
                            ElementFactory.input.number(component.cost * .01, .01, undefined, .01)
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
                                    finally { component.cost = self.valueAsNumber * 100; }
                                })
                                .style({ width: "6em" })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();
        }
        else if (component instanceof EventInfo.Components.Registerable) {
            return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "section-gap")
                .children(
                    ElementFactory.h4("how_to_reg").class("icon", "no-margin"),
                    ElementFactory.div(undefined, "flex-columns", "center-content", "section-gap")
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
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen") :
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
                            ElementFactory.h4(component.translatedName).class("no-margin", "text-center"),
                            ElementFactory.input.dateTimeLocal(component.moment, new Date(), ev.starts_at)
                                .on("input", (_, self) => {
                                    try {
                                        const val = new Date(self.value);
                                        if (DateUtil.Timestamps.isValid(val)) component.moment = DateUtil.Timestamps.clamp(val, new Date(), ev.starts_at);
                                    }
                                    catch (e) { /* ignore */ }
                                })
                                .on("change", (_, self) => {
                                    try {
                                        const val = new Date(self.value);
                                        
                                        if (!DateUtil.Timestamps.isValid(val)) DateUtil.Timestamps.setInputValue(self, component.moment);
                                        else if (val < new Date()) DateUtil.Timestamps.setInputValue(self, new Date());
                                        else if (val > ev.starts_at) DateUtil.Timestamps.setInputValue(self, ev.starts_at);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        DateUtil.Timestamps.setInputValue(self, component.moment);
                                    }
                                    finally { component.moment = new Date(self.value); }
                                })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen") :
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
                            ElementFactory.h4(component.translatedName).class("no-margin", "text-center"),
                            ElementFactory.input.dateTimeLocal(component.moment, ev.getComponent(EventInfo.Components.RegistrationStart)?.moment ?? new Date(), ev.starts_at)
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
                                        const val = new Date(self.value);
                                        const min = ev.getComponent(EventInfo.Components.RegistrationStart)?.moment ?? new Date();
                                        
                                        if (!DateUtil.Timestamps.isValid(val)) DateUtil.Timestamps.setInputValue(self, component.moment);
                                        else if (val < min) DateUtil.Timestamps.setInputValue(self, min);
                                        else if (val > ev.starts_at) DateUtil.Timestamps.setInputValue(self, ev.starts_at);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        DateUtil.Timestamps.setInputValue(self, component.moment);
                                    }
                                    finally { component.moment = new Date(self.value); }
                                })
                        ),
                    canBeRemoved ?
                        ElementFactory.iconButton("remove", () => this.removeComponent(component), "Instelling verwijderen") :
                        ElementFactory.h4("check").class("icon", "no-margin")
                )
                .make();

        }
        else throw new Error(`invalid component: ${component}`);
    }

}

customElements.define("event-component-editor", EventComponentEditor);