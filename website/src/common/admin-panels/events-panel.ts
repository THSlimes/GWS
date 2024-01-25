import EventCalendar from "../custom-elements/EventCalendar";
import Placeholder from "../custom-elements/Placeholder";
import "../custom-elements/Switch";
import Switch from "../custom-elements/Switch";
import CachingEventDatebase from "../firebase/database/events/CachingEventDatebase";
import FirestoreEventDatebase from "../firebase/database/events/FirestoreEventDatabase";
import { fromInputs } from "../util/DateUtil";

enum ValidityStatus {
    VALID = "valid",
    WARNING = "warning",
    INVALID = "invalid"
}

const VALIDITY_ICONS:Record<ValidityStatus,string> = {
    [ValidityStatus.VALID]: "",
    [ValidityStatus.WARNING]: "warning",
    [ValidityStatus.INVALID]: "error"
};

type Validity = {
    status:ValidityStatus.VALID,
    reason?:string
} | {
    status:ValidityStatus.INVALID|ValidityStatus.WARNING,
    reason:string
};

let EVENT_DETAILS_FORM:HTMLDivElement;

let NAME_INPUT:HTMLTextAreaElement;
let CATEGORY_INPUT:HTMLInputElement;
let USE_COLOR_SWITCH:Switch;
let COLOR_INPUT:HTMLInputElement;
let DESCRIPTION_INPUT:HTMLTextAreaElement;
let GENERAL_FEEDBACK:HTMLDivElement;

function checkGeneralDetails():Validity {
    if (!NAME_INPUT.value.trim()) return { status: ValidityStatus.INVALID, reason: "Naam-veld is leeg." };

    if (!DESCRIPTION_INPUT.value.trim()) return { status: ValidityStatus.WARNING, reason: "Omschrijving-veld is leeg." };
    if (!CATEGORY_INPUT.value.trim()) return { status: ValidityStatus.WARNING, reason: "Categorie-veld is leeg." };

    return { status: ValidityStatus.VALID };
}



let WHOLE_DAYS_SWITCH:Switch;
let START_DATE_INPUT:HTMLInputElement;
let START_TIME_INPUT:HTMLInputElement;
let END_DATE_INPUT:HTMLInputElement;
let END_TIME_INPUT:HTMLInputElement;
let TIMESPAN_FEEDBACK:HTMLDivElement;

const getStartDate = () => fromInputs(START_DATE_INPUT, WHOLE_DAYS_SWITCH.value ? "00:00:00:000" : START_TIME_INPUT);
const getEndDate = () => fromInputs(END_DATE_INPUT, WHOLE_DAYS_SWITCH.value ? "23:59:59:999" : END_TIME_INPUT);

function checkTimespan():Validity {
    if (!START_DATE_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Begindatum is leeg." };
    else if (!WHOLE_DAYS_SWITCH.value && !START_TIME_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Begintijd is leeg." };
    else if (!END_DATE_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Einddatum is leeg." };
    else if (!WHOLE_DAYS_SWITCH.value && !END_TIME_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Eindtijd is leeg." };
    else if (getEndDate() < getStartDate()) return { status: ValidityStatus.INVALID, reason: "Eindmoment is voor beginmoment." };

    return { status: ValidityStatus.VALID };
}



let REGISTERABLE_SWITCH:Switch;
let REGISTRATION_START_DATE_INPUT:HTMLInputElement;
let REGISTRATION_START_TIME_INPUT:HTMLInputElement;
let REGISTRATION_END_DATE_INPUT:HTMLInputElement;
let REGISTRATION_END_TIME_INPUT:HTMLInputElement;
let REGISTRATION_FEEDBACK:HTMLDivElement;

const getRegistrationStartDate = () => fromInputs(REGISTRATION_START_DATE_INPUT, REGISTRATION_START_TIME_INPUT);
const getRegistrationEndDate = () => fromInputs(REGISTRATION_END_DATE_INPUT, REGISTRATION_END_TIME_INPUT);

function checkRegistrationDetails():Validity {
    if (REGISTERABLE_SWITCH.value) {
        if (!REGISTRATION_START_DATE_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Startdatum is leeg." };
        else if (!REGISTRATION_START_TIME_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Starttijd is leeg." };
        else if (!REGISTRATION_END_DATE_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Einddatum is leeg." };
        else if (!REGISTRATION_END_TIME_INPUT.value) return { status: ValidityStatus.INVALID, reason: "Eindtijd is leeg." };
        else if (getRegistrationEndDate() < getRegistrationStartDate()) return { status: ValidityStatus.INVALID, reason: "Eindmoment is voor startmoment." };
    }

    return { status: ValidityStatus.VALID };
}



let ADD_NEW_EVENT_BUTTON:HTMLButtonElement;

function detailsValid():boolean {
    return checkGeneralDetails().status === ValidityStatus.VALID
        && checkTimespan().status === ValidityStatus.VALID
        && checkRegistrationDetails().status === ValidityStatus.VALID;
}



window.addEventListener("DOMContentLoaded", () => { // getting elements from page
    EVENT_DETAILS_FORM = document.getElementById("new-event-details") as HTMLDivElement;

    NAME_INPUT = document.getElementById("new-event-name") as HTMLTextAreaElement;
    CATEGORY_INPUT = document.getElementById("new-event-category") as HTMLInputElement;
    USE_COLOR_SWITCH = document.getElementById("new-event-use-color") as Switch;
    COLOR_INPUT = document.getElementById("new-event-color") as HTMLInputElement;
    DESCRIPTION_INPUT = document.getElementById("new-event-description") as HTMLTextAreaElement;
    GENERAL_FEEDBACK = document.getElementById("new-event-general-feedback") as HTMLDivElement;

    WHOLE_DAYS_SWITCH = document.getElementById("new-event-whole-days") as Switch;
    START_DATE_INPUT = document.getElementById("new-event-start-date") as HTMLInputElement;
    START_TIME_INPUT = document.getElementById("new-event-start-time") as HTMLInputElement;
    END_DATE_INPUT = document.getElementById("new-event-end-date") as HTMLInputElement;
    END_TIME_INPUT = document.getElementById("new-event-end-time") as HTMLInputElement;
    TIMESPAN_FEEDBACK = document.getElementById("new-event-timespan-feedback") as HTMLDivElement;

    REGISTERABLE_SWITCH = document.getElementById("new-event-registerable") as Switch;
    REGISTRATION_START_DATE_INPUT = document.getElementById("new-event-registration-start-date") as HTMLInputElement;
    REGISTRATION_START_TIME_INPUT = document.getElementById("new-event-registration-start-time") as HTMLInputElement;
    REGISTRATION_END_DATE_INPUT = document.getElementById("new-event-registration-end-date") as HTMLInputElement;
    REGISTRATION_END_TIME_INPUT = document.getElementById("new-event-registration-end-time") as HTMLInputElement;
    REGISTRATION_FEEDBACK = document.getElementById("new-event-registration-feedback") as HTMLDivElement;

    ADD_NEW_EVENT_BUTTON = document.getElementById("add-new-event-button") as HTMLButtonElement;
});

const DB = new CachingEventDatebase(new FirestoreEventDatebase());

let initializedEventsPanel = false;
export function initEventsPanel() {
    if (!initializedEventsPanel) {
        const calendar = Placeholder.replaceWith("event-calendar", new EventCalendar(DB, new Date(), "month"));

        EVENT_DETAILS_FORM.addEventListener("input", () => {
            GENERAL_FEEDBACK.classList.remove(...Object.values(ValidityStatus));
            const generalValidity = checkGeneralDetails();
            GENERAL_FEEDBACK.firstElementChild!.textContent = VALIDITY_ICONS[generalValidity.status];
            GENERAL_FEEDBACK.lastElementChild!.textContent = generalValidity.reason ?? "";
            GENERAL_FEEDBACK.classList.add(generalValidity.status);

            TIMESPAN_FEEDBACK.classList.remove(...Object.values(ValidityStatus));
            const timespanValidity = checkTimespan();
            TIMESPAN_FEEDBACK.firstElementChild!.textContent = VALIDITY_ICONS[timespanValidity.status];
            TIMESPAN_FEEDBACK.lastElementChild!.textContent = timespanValidity.reason ?? "";
            TIMESPAN_FEEDBACK.classList.add(timespanValidity.status);

            REGISTRATION_FEEDBACK.classList.remove(...Object.values(ValidityStatus));
            const registrationValidity = checkRegistrationDetails();
            REGISTRATION_FEEDBACK.firstElementChild!.textContent = VALIDITY_ICONS[registrationValidity.status];
            REGISTRATION_FEEDBACK.lastElementChild!.textContent = registrationValidity.reason ?? "";
            REGISTRATION_FEEDBACK.classList.add(registrationValidity.status);
            
            ADD_NEW_EVENT_BUTTON.disabled = !detailsValid();
            
        });
        EVENT_DETAILS_FORM.dispatchEvent(new InputEvent("input"));

        initializedEventsPanel = true;
    }
}