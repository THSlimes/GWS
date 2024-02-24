import ElementFactory from "../../html-element-factory/ElementFactory";
import { EventInfo } from "../../firebase/database/events/EventDatabase";
import { showError, showSuccess, showWarning } from "../../ui/info-messages";
import { HasSections } from "../../util/UtilTypes";
import getErrorMessage from "../../firebase/authentication/error-messages";
import ColorUtil from "../../util/ColorUtil";
import DateUtil from "../../util/DateUtil";
import { onPermissionCheck } from "../../firebase/authentication/permission-based-redirect";
import Permission from "../../firebase/database/Permission";
import EventCalendar from "../EventCalendar";
import Switch from "../Switch";
import { HexColor } from "../../util/StyleUtil";
import FunctionUtil from "../../util/FunctionUtil";
import RichTextInput from "../rich-text/RichTextInput";
import { DetailLevel } from "../../util/UtilTypes";
import OptionCollection from "../../ui/OptionCollection";

export type EventNoteSectionName = "name" | "timespan" | "description" | "quickActions";
export class EventNote extends HTMLElement implements HasSections<EventNoteSectionName> {

    protected static CAN_DELETE = false;
    protected static CAN_UPDATE = false;

    static {
        onPermissionCheck([Permission.DELETE_EVENTS, Permission.UPDATE_EVENTS], (_, res) => {
            this.CAN_DELETE = res.DELETE_EVENTS;
            this.CAN_UPDATE = res.UPDATE_EVENTS;
        }, true, true);
    }
    
    protected static SECTIONS_VISIBLE_FROM:Record<EventNoteSectionName,DetailLevel> = {
        name: DetailLevel.LOW,
        timespan: DetailLevel.MEDIUM,
        description: DetailLevel.HIGH,
        quickActions: DetailLevel.HIGH
    };

    protected isVisible(sectionName:EventNoteSectionName):boolean {
        return EventNote.SECTIONS_VISIBLE_FROM[sectionName] <= this.lod;
    }

    public name!:HTMLHeadingElement;
    public timespan!:HTMLParagraphElement;
    public description!:HTMLDivElement;
    public quickActions!:HTMLDivElement;

    protected readonly expanded:boolean;
    private _lod!:DetailLevel;
    public get lod() { return this._lod; }
    public set lod(newLOD) {
        if (newLOD !== this.lod) {
            this._lod = newLOD; // store LOD
            this.setAttribute("lod", this.lod.toString());
            const ownClass = (this.constructor as typeof EventNote);

            for (const k in ownClass.SECTIONS_VISIBLE_FROM) { // apply lod
                const sectionName = k as EventNoteSectionName;
                const elem = this[sectionName];
                if (elem) elem.hidden = this.lod < ownClass.SECTIONS_VISIBLE_FROM[sectionName];
            }
        }
    }

    public readonly event:EventInfo;
    /** Replaces the EventNote with its editable version. */
    protected replaceWithEditable(event=this.event):void {
        this.replaceWith(new EditableEventNote(event, this.lod, this.expanded));
    }

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super();

        this.expanded = expanded;
        this.event = event;
        this.initElement();

        this.lod = lod;

    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("section-gap", this.expanded);
        this.toggleAttribute("expanded", this.expanded);

        // apply color palette
        const bgColor = this.event.color ?? ColorUtil.getStringColor(this.event.category);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#111111", "#ffffff"));

        // name section
        this.name = this.appendChild(ElementFactory.heading(this.expanded ? 1 : 5, this.event.name).class("name", "no-margin").make());

        // timespan section
        let timespanText:string;
        if (DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at])) {
            timespanText = DateUtil.Days.isSame(this.event.starts_at, this.event.ends_at) ?
                DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at) :
                `${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.ends_at)}`;
        }
        else timespanText = `${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.ends_at)}`;

        this.timespan = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic", "no-margin").make());

        // description section
        this.description = this.appendChild(ElementFactory.richText(this.event.description).class("description").make());

        // quick actions section
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions", "flex-columns")
                .children(
                    EventNote.CAN_DELETE && ElementFactory.iconButton("delete", (_, self) => {
                            if (self.hasAttribute("awaiting-confirmation")) this.event.sourceDB.delete(this.event)
                                .then(() => {
                                    showSuccess("Activiteit is succesvol verwijderd.");
                                    EventCalendar.closeFullscreenNote();
                                })
                                .catch(() => showError("Kon activiteit niet verwijderen, probeer het later opnieuw."));
                            else {
                                self.toggleAttribute("awaiting-confirmation", true);
                                self.textContent = "delete_forever";
                                showWarning("Weet je het zeker? Een activiteit verwijderen kan niet worden teruggedraaid.", 3000);
                                setTimeout(() => {
                                    self.removeAttribute("awaiting-confirmation");
                                    self.textContent = "delete";
                                }, 3000);
                            }
                        }, "Activiteit verwijderen")
                        .class("delete-button"),
                    EventNote.CAN_UPDATE && ElementFactory.iconButton("edit_square", () => this.replaceWithEditable(this.event), "Activiteit bewerken"),
                    ElementFactory.iconButton("share", () => {
                            const url = `${location.origin}/calendar.html#looking-at=${this.event.id}`;
                            const shareData:ShareData = { url, title: `GWS Activiteit - ${this.event.name}` };
                            if (navigator.canShare(shareData)) navigator.share(shareData); // share
                            else navigator.clipboard.writeText(url) // can't share, copy to clipboard
                                .then(() => showSuccess("Link gekopieerd!"))
                                .catch(() => showError("Kan link niet kopiëren, probeer het later opnieuw."));
                        }, "Delen"),
                    ElementFactory.iconButton("close", () => EventCalendar.closeFullscreenNote()),
                )
                .make()
        );
    }

    public copy(lod:DetailLevel=this._lod, expanded:boolean=this.expanded) {
        return new EventNote(this.event, lod ?? this.lod, expanded ?? this.expanded);
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("event-note", EventNote));



export type EditableEventNoteSectionName = "name" | "category" | "useTime" | "startsAt" | "endsAt" | "description" | "quickActions";
export type EventNoteOptionMap = {
    "color": HexColor
};
export class EditableEventNote extends HTMLElement implements HasSections<EditableEventNoteSectionName> {

    public name!:HTMLHeadingElement;
    public category!:HTMLTextAreaElement;
    public useTime!:Switch;
    public startsAt!:HTMLInputElement;
    public endsAt!:HTMLInputElement;
    public description!:RichTextInput;
    public quickActions!:HTMLDivElement;

    private optionCollection:OptionCollection<string,{}> = new OptionCollection({});
    protected addOptions(newOptions:OptionCollection<string,any>) {
        const combined = this.optionCollection.combine(newOptions);
        this.optionCollection.replaceWith(combined);
        this.optionCollection = combined;
    }

    private noteOptions!:OptionCollection<keyof EventNoteOptionMap, EventNoteOptionMap>;

    protected readonly event:EventInfo;
    /** Replaces the EditableEventNote with its non-editable version. */
    protected replaceWithOriginal(event=this.event):void {
        this.replaceWith(new EventNote(event, this.lod, this.expanded));
    }

    protected get savableEvent() {
        return new EventInfo(
            this.event.sourceDB,
            this.event.id,
            this.name.textContent ?? "Activiteit",
            this.description.value,
            this.category.value ? this.category.value : undefined,
            this.noteOptions.has("color") ? this.noteOptions.get("color")! : undefined,
            [this.startDate, this.endDate]
        );
    }

    protected readonly lod:DetailLevel;
    protected readonly expanded:boolean;

    private get startDate() {
        let out = new Date(this.startsAt.value);
        if (!DateUtil.Timestamps.isValid(out)) out = this.event.starts_at;

        if (!this.useTime.value) out.setHours(0, 0, 0, 0);
        
        return out;
    }

    private get endDate() {
        let out = new Date(this.endsAt.value);
        if (!DateUtil.Timestamps.isValid(out)) out = this.event.ends_at;
        
        if (!this.useTime.value) out.setHours(23, 59, 59, 999);
        
        return out;
    }

    private refreshColorPalette() {
        // apply color palette
        const bgColor = this.noteOptions.has("color") ? this.noteOptions.get("color")! : ColorUtil.getStringColor(this.category.value);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#111111", "#ffffff"));
    }

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super();

        this.event = event;
        this.lod = lod;
        this.expanded = expanded;

        this.initElement();
        
    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("section-gap", this.expanded);
        this.toggleAttribute("expanded", this.expanded);

        const refreshColorCallback = () => this.refreshColorPalette();

        this.appendChild( // name and category sections
            ElementFactory.div(undefined, "flex-columns", "in-section-gap")
                .children(
                    this.name = ElementFactory.heading(this.expanded ? 1 : 5, this.event.name)
                        .class("name", "no-margin")
                        .attr("contenteditable", "plaintext-only")
                        .make(),
                    this.category = ElementFactory.textarea(this.event.category)
                        .class("category")
                        .attr("no-resize")
                        .placeholder("Categorie")
                        .on("input", () => FunctionUtil.setDelayedCallback(refreshColorCallback, 250))
                        .make()
                )
                .make(),
        );

        // timespan section
        const areFullDays = DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at]);
        this.appendChild(
            ElementFactory.div(undefined, "timespan", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    this.startsAt = areFullDays ?
                        ElementFactory.input.date(this.event.starts_at).make() :
                        ElementFactory.input.dateTimeLocal(this.event.starts_at).make(),
                    ElementFactory.p("t/m").class("no-margin"),
                    this.endsAt = areFullDays ?
                        ElementFactory.input.date(this.event.ends_at).make() :
                        ElementFactory.input.dateTimeLocal(this.event.ends_at).make(),
                    ElementFactory.div(undefined, "icon-switch", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.p("more_time").class("icon", "no-margin"),
                            this.useTime = new Switch(!areFullDays)
                        )
                        .tooltip("Tijd instellen")
                )
                .make()
        );

        this.useTime.addEventListener("input", () => { // update on switch
                                    
            const newSAInput = this.useTime.value ?
                ElementFactory.input.dateTimeLocal(this.startsAt.valueAsDate ?? this.event.starts_at).make() :
                ElementFactory.input.date(this.startsAt.valueAsDate ?? this.event.starts_at).make();
            this.startsAt.replaceWith(newSAInput);
            this.startsAt = newSAInput;

            const newEAInput = this.useTime.value ?
                ElementFactory.input.dateTimeLocal(this.endsAt.valueAsDate ?? this.event.ends_at).make() :
                ElementFactory.input.date(this.endsAt.valueAsDate ?? this.event.ends_at).make();
            this.endsAt.replaceWith(newEAInput);
            this.endsAt = newEAInput;
        });

        // description section
        this.description = this.appendChild(
            ElementFactory.input.richText(this.event.description, true)
                .class("description")
                .placeholder("Beschrijving")
                .make()
        );

        // options
        this.appendChild(this.optionCollection);

        this.noteOptions = new OptionCollection<keyof EventNoteOptionMap, EventNoteOptionMap>({
            "color": [
                "palette",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Kleurenpalet instellen").class("no-margin"),
                        ElementFactory.input.color(this.event.color ?? "#eeeeee")
                        .onValueChanged(() => this.refreshColorPalette()),
                    )
                    .make(),
                elem => (elem.lastChild as HTMLInputElement).value as HexColor
            ]
        }, { "color": "Kleurenpalet" });
        if (this.event.color !== undefined) this.noteOptions.add("color");

        this.optionCollection.onActiveOptionsChanged = () => this.refreshColorPalette();

        this.addOptions(this.noteOptions);

        this.refreshColorPalette();

        // quick-actions section
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions", "flex-columns")
                .children(
                    ElementFactory.iconButton("save_as", () => {
                        const newEvent = this.savableEvent;

                        this.event.sourceDB.write(newEvent)
                        .then(() => {
                            showSuccess("Activiteit is succesvol bijgewerkt.");
                            this.replaceWithOriginal(newEvent);
                        })
                        .catch(err => showError(getErrorMessage(err)));
                    }, "Aanpassingen opslaan"),
                    ElementFactory.iconButton("backspace", () => this.replaceWithOriginal(), "Annuleren")
                )
                .make()
        );
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("editable-event-note", EditableEventNote));