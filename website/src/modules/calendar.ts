import "./header-and-footer";
import "./create-split-view";

import EventCalendar from "../common/custom-elements/EventCalendar";
import FirestoreEventDatebase from "../common/firebase/database/events/FirestoreEventDatabase";
import Placeholder from "../common/custom-elements/Placeholder";

const EVENT_CALENDAR = new EventCalendar(new FirestoreEventDatebase(), new Date());

window.addEventListener("load", () => {
    Placeholder.replaceWith("event-calendar", EVENT_CALENDAR);
});