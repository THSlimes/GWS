import EventCalender from "../common/custom-elements/EventCalender";

const EVENT_CALENDER = new EventCalender();

window.addEventListener("load", () => {
    document.getElementById("calender")?.appendChild(EVENT_CALENDER);
});