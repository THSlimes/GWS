import EventCalendar from "../custom-elements/EventCalendar";
import Placeholder from "../custom-elements/Placeholder";
import "../custom-elements/Switch";
import CachingEventDatebase from "../firebase/database/events/CachingEventDatebase";
import FirestoreEventDatebase from "../firebase/database/events/FirestoreEventDatabase";

const DB = new CachingEventDatebase(new FirestoreEventDatebase());

let initializedEventsPanel = false;
export function initEventsPanel() {
    if (!initializedEventsPanel) {
        const calendar = Placeholder.replaceWith("event-calendar", new EventCalendar(DB, new Date(), "month"));

        initializedEventsPanel = true;
    }
}