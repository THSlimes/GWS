import "./header-and-footer";
import "./create-split-view";

import EventCalendar from "../common/custom-elements/EventCalendar";
import FirestoreEventDatebase from "../common/firebase/database/events/FirestoreEventDatabase";

const EVENT_calendar = new EventCalendar(new FirestoreEventDatebase(), new Date("Tue Nov 25 2023"), "month");

window.addEventListener("load", () => {
    document.getElementById("calendar")?.appendChild(EVENT_calendar);
});