import getErrorMessage from "../../firebase/authentication/error-messages";
import { onPermissionCheck } from "../../firebase/authentication/permission-based-redirect";
import Permission from "../../firebase/database/Permission";
import { EventInfo, RegisterableEventInfo } from "../../firebase/database/events/EventDatabase";
import { onAuth } from "../../firebase/init-firebase";
import ElementFactory from "../../html-element-factory/ElementFactory";
import OptionCollection from "../../ui/OptionCollection";
import { showError, showSuccess } from "../../ui/info-messages";
import DateUtil from "../../util/DateUtil";
import ObjectUtil from "../../util/ObjectUtil";
import URLUtil from "../../util/URLUtil";
import { DetailLevel, HasSections } from "../../util/UtilTypes";
import Switch from "../Switch";
import { EditableEventNote, EditableEventNoteSectionName, EventNote, EventNoteOptionMap, EventNoteSectionName } from "./EventNote";

/** [icon, text, enabled] tuple */
type RegisterButtonState = [string, string, boolean];

type RegisterableEventNoteSectionName = EventNoteSectionName | "paymentDisclaimer" | "allowPaymentSwitch" | "commentBox" | "registerButton";
export default class RegisterableEventNote extends EventNote implements HasSections<RegisterableEventNoteSectionName> {

    private static CAN_REGISTER = false;
    private static CAN_DEREGISTER = false;

    static { // get permissions
        onPermissionCheck([Permission.REGISTER_FOR_EVENTS, Permission.DEREGISTER_FOR_EVENTS], (_, res) => {
            this.CAN_REGISTER = res.REGISTER_FOR_EVENTS;
            this.CAN_DEREGISTER = res.DEREGISTER_FOR_EVENTS;
        }, true, true);
    }

    protected static override SECTIONS_VISIBLE_FROM: Record<RegisterableEventNoteSectionName, DetailLevel> = {
        ...super.SECTIONS_VISIBLE_FROM,
        paymentDisclaimer: DetailLevel.FULL,
        allowPaymentSwitch: DetailLevel.FULL,
        commentBox: DetailLevel.FULL,
        registerButton: DetailLevel.FULL
    };

    protected override isVisible(sectionName:RegisterableEventNoteSectionName):boolean {
        return RegisterableEventNote.SECTIONS_VISIBLE_FROM[sectionName] <= this.lod;
    }

    public paymentDisclaimer!:HTMLDivElement|null;
    public allowPaymentSwitch!:Switch|null;
    public commentBox!:HTMLTextAreaElement;
    public registerButton!:HTMLButtonElement;

    private refreshRegistrationDetails() {
        onAuth()
        .then(user => {
            const allowsPayment = this.allowPaymentSwitch === null || this.allowPaymentSwitch?.value;
            const isRegistered = user !== null && this.event.isRegistered(user.uid);
            let state:RegisterButtonState;
            const now = new Date();

            if (!user) state = ["login", "Log in om je in te schrijven", true];
            else {
                if (this.event.ends_at <= now) state = ["event_busy", "Activiteit is al voorbij", false];
                else if (this.event.starts_at <= now) state = ["calendar_today", "Activiteit is al gestart", false];
                else if (this.event.can_register_until && this.event.can_register_until <= now) {
                    state = ["event_upcoming", "Inschrijving is al gesloten", false];
                }
                else if (this.event.can_register_from && now <= this.event.can_register_from) {
                    state = ["calendar_clock", `Inschrijven kan pas vanaf ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.can_register_from)}`, false];
                }
                else if (isRegistered) state = RegisterableEventNote.CAN_DEREGISTER ?
                    ["free_cancellation", "Uitschrijven", true] :
                    ["event_available", "Ingeschreven", false];
                else if (this.event.isFull()) state = ["event_busy", "Activiteit zit vol", false];
                else state = RegisterableEventNote.CAN_REGISTER ?
                    ["calendar_add_on", "Inschrijven", allowsPayment] :
                    ["event_busy", "Inschrijving niet mogelijk", false];
            }

            [this.registerButton.firstElementChild!.textContent, this.registerButton.children[1].textContent] = state;
            this.registerButton.disabled = !state[2];

            if (this.paymentDisclaimer && this.isVisible("paymentDisclaimer")) this.paymentDisclaimer.hidden = user === null || isRegistered;
            if (this.isVisible("commentBox")) this.commentBox.hidden = user === null || isRegistered;
        })
        .catch(console.error);
    }

    override event!:RegisterableEventInfo;
    protected override replaceWithEditable(event=this.event):void {
        this.replaceWith(new EditableRegisterableEventNote(event, this.lod, this.expanded));
    }

    constructor(regEvent:RegisterableEventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super(regEvent, lod, expanded);
    }

    public override initElement(): void {
        super.initElement();

        // payment disclaimer section
        if (this.event.requires_payment) {
            this.paymentDisclaimer = this.appendChild(
            ElementFactory.div(undefined, "payment-disclaimer", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.p("Ik ga akkoord met de kosten van deze activiteit.").class("no-margin"),
                    ElementFactory.div(undefined, "icon-switch", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.p("euro_symbol").class("icon", "no-margin"),
                            this.allowPaymentSwitch = new Switch(false)
                        )
                        .tooltip("Kosten accepteren")
                )
                .make()
            );

            this.allowPaymentSwitch.addEventListener("input", () => this.refreshRegistrationDetails());
        }

        // comment box
        this.commentBox = this.appendChild(
            ElementFactory.textarea()
                .class("comment-box")
                .placeholder("Opmerking")
                .attr("no-resize")
                .spellcheck(true)
                .maxLength(512)
                .make()
        );

        // register button
        this.registerButton = this.appendChild(
            ElementFactory.button(() => onAuth()
                .then(user => {
                    if (!user) location.href = URLUtil.createLinkBackURL("./login.html").toString(); // must log in to register
                    else this.event.toggleRegistered(user.uid, this.commentBox.value)
                        .then(isReg => {
                            showSuccess(`Je bent succesvol ${isReg ? "ingeschreven" : "uitgeschreven"}.`);
                            this.refreshRegistrationDetails();
                        })
                        .catch(err => showError(getErrorMessage(err)))
                })
                .catch(err => showError(getErrorMessage(err)))
            )
            .class("register-button")
            .attr("no-select")
            .children(ElementFactory.h4("event").class("icon"), ElementFactory.h4("Inschrijven"))
            .make()
        );
        this.refreshRegistrationDetails();
    }

    public override copy(lod?:DetailLevel, expanded?:boolean):RegisterableEventNote {
        return new RegisterableEventNote(this.event, lod ?? this.lod, expanded ?? this.expanded);
    }

}

customElements.define("registerable-event-note", RegisterableEventNote);

type EditableRegisterableEventNoteSectionName = EditableEventNoteSectionName | "capacity" | "registrationStart" | "registrationEnd" | "requiresPayment";
type RegisterableEventNoteOptionMap = {
    capacity: number,
    canRegisterFrom: Date,
    canRegisterUntil: Date,
    requiresPayment: boolean
};
export class EditableRegisterableEventNote extends EditableEventNote implements HasSections<EditableRegisterableEventNoteSectionName> {

    public capacity!:HTMLInputElement;
    public registrationStart!:HTMLInputElement;
    public registrationEnd!:HTMLInputElement;
    public requiresPayment!:Switch;

    private registrationOptions!:OptionCollection<keyof RegisterableEventNoteOptionMap, RegisterableEventNoteOptionMap>;

    protected override event!:RegisterableEventInfo;
    protected override get savableEvent():RegisterableEventInfo {
        return RegisterableEventInfo.fromSuper(
            super.savableEvent,
            this.event.registrations,
            this.registrationOptions.get("requiresPayment") ?? false,
            this.registrationOptions.get("capacity"),
            [this.registrationOptions.get("canRegisterFrom"), this.registrationOptions.get("canRegisterUntil")]
        );
    }

    protected override replaceWithOriginal(regEvent=this.event):void {
        this.replaceWith(new RegisterableEventNote(regEvent, this.lod, this.expanded));
    }

    constructor(regEvent:RegisterableEventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super(regEvent, lod, expanded);
    }

    public override initElement():void {
        super.initElement();

        this.registrationOptions = new OptionCollection({
            "capacity": [
                "social_distance",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Maximaal aantal inschrijvingen").class("no-margin"),
                        ElementFactory.input.number(Math.max(1, this.event.capacity ?? 0, ObjectUtil.sizeOf(this.event.registrations)))
                            .min(Math.max(1, ObjectUtil.sizeOf(this.event.registrations)))
                            .step(1)
                            .style({"width": "4em"})
                    )
                    .make(),
                elem => {
                    const input = elem.lastChild as HTMLInputElement;
                    return input.value ? input.valueAsNumber : 0;
                }
            ],
            "canRegisterFrom": [
                "line_start_square",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Inschrijving kan vanaf").class("no-margin"),
                        ElementFactory.input.dateTimeLocal(this.event.can_register_from ?? new Date()).max(this.event.starts_at)
                    )
                    .make(),
                elem => {
                    const date = new Date((elem.lastChild as HTMLInputElement).value);
                    return DateUtil.Timestamps.isValid(date) ? date : new Date();
                }
            ],
            "canRegisterUntil": [
                "line_end_square",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Inschrijving kan t/m").class("no-margin"),
                        ElementFactory.input.dateTimeLocal(this.event.can_register_until ?? this.event.starts_at).max(this.event.starts_at)
                    )
                    .make(),
                    elem => {
                        const date = new Date((elem.lastChild as HTMLInputElement).value);
                        return DateUtil.Timestamps.isValid(date) ? date : this.event.starts_at;
                    }
            ],
            "requiresPayment": ["euro_symbol", ElementFactory.h4("Activiteit kost geld").class("text-center", "no-margin").make(), () => true],
        }, {
            "capacity": "Maximaal aantal inschrijvingen",
            "canRegisterFrom": "Startmoment voor inschrijving",
            "canRegisterUntil": "Eindmoment voor inschrijving",
            "requiresPayment": "Activiteit kost geld"
        });

        if (this.event.requires_payment) this.registrationOptions.add("requiresPayment");
        if (this.event.can_register_from !== undefined) this.registrationOptions.add("canRegisterFrom");
        if (this.event.can_register_until !== undefined) this.registrationOptions.add("canRegisterUntil");
        if (this.event.capacity !== undefined) this.registrationOptions.add("capacity");

        this.addOptions(this.registrationOptions);

        this.querySelector("option-collection")!.prepend( // fake "registerable" option
            ElementFactory.div(undefined, "option", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.p("how_to_reg").class("icon"),
                    ElementFactory.h4("Inschrijfbaar voor leden").class("no-margin").style({"textAlign": "center"}),
                    ElementFactory.p("done").class("icon"),
                )
                .make()
        );
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("editable-registerable-event-note", EditableRegisterableEventNote));