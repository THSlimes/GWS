import "./header-and-footer";
import "./create-split-view";

import EventCalender from "../common/custom-elements/EventCalender";
import FirestoreEventDatebase from "../common/firebase/database/events/FirestoreEventDatabase";

const EVENT_CALENDER = new EventCalender(new FirestoreEventDatebase(), new Date("Wed Nov 2 2023 00:05:03"), "month");

window.addEventListener("load", () => {
    document.getElementById("calender")?.appendChild(EVENT_CALENDER);
});