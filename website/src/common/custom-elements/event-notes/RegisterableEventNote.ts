import getErrorMessage from "../../firebase/authentication/error-messages";
import { onPermissionCheck } from "../../firebase/authentication/permission-based-redirect";
import Permission from "../../firebase/database/Permission";
import { RegisterableEventInfo } from "../../firebase/database/events/EventDatabase";
import { onAuth } from "../../firebase/init-firebase";
import ElementFactory from "../../html-element-factory/ElementFactory";
import { showError, showSuccess } from "../../ui/info-messages";
import DateUtil from "../../util/DateUtil";
import URLUtil from "../../util/URLUtil";
import { DetailLevel, HasSections } from "../../util/UtilTypes";
import Switch from "../Switch";
import { EventNote, EventNoteSectionName } from "./EventNote";

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
                    this.allowPaymentSwitch = new Switch(false)
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