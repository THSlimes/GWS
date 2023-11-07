import "./header-and-footer";
import "./create-split-view";

import EventCalender from "../common/custom-elements/EventCalender";
import { FirestoreEventDatebase } from "../common/firebase/database/FirestoreEventDatabase";

const EVENT_CALENDER = new EventCalender(new FirestoreEventDatebase(), new Date(), "month");

window.addEventListener("load", () => {
    document.getElementById("calender")?.appendChild(EVENT_CALENDER);
});