import EventCalendar from "../custom-elements/EventCalendar";
import CachingEventDatebase from "../firebase/database/events/CachingEventDatebase";
import FirestoreEventDatebase from "../firebase/database/events/FirestoreEventDatabase";

const DB = new CachingEventDatebase(new FirestoreEventDatebase());

let initializedEventsPanel = false;
export function initEventsPanel() {
    if (!initializedEventsPanel) {
        const calendarPlaceholder = document.querySelector("#events-panel > #event-calendar[placeholder]") as HTMLDivElement;
        calendarPlaceholder.replaceWith(new EventCalendar(DB, new Date(), "month"));

        initializedEventsPanel = true;
    }
}