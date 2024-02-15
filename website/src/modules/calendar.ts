import "./header-and-footer";
import "./create-split-view";

import EventCalendar from "../common/custom-elements/EventCalendar";
import FirestoreEventDatebase from "../common/firebase/database/events/FirestoreEventDatabase";

const EVENT_CALENDAR = new EventCalendar(new FirestoreEventDatebase(), new Date());

window.addEventListener("load", () => {
    document.getElementById("calendar")?.appendChild(EVENT_CALENDAR);
});