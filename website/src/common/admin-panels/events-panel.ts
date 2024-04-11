import EventCalendar from "../custom-elements/EventCalendar";
import Placeholder from "../custom-elements/Placeholder";
import "../custom-elements/Switch";
import "../custom-elements/FolderElement";
import CachingEventDatebase from "../firebase/database/events/CachingEventDatebase";
import FirestoreEventDatebase from "../firebase/database/events/FirestoreEventDatabase";
import { EventInfo } from "../firebase/database/events/EventDatabase";
import StringUtil from "../util/StringUtil";
import { EditableEventNote } from "../custom-elements/EventNote";
import { DetailLevel } from "../util/UtilTypes";
import Loading from "../Loading";

const DB = new CachingEventDatebase(new FirestoreEventDatebase());

/** Creates an EditableEventNote for new events (is added to database upon saving) */
function getEmptyNote():EditableEventNote {
    const out = new EditableEventNote( // placeholder into
        new EventInfo(DB, StringUtil.generateID(), "", "", "", undefined, [new Date(), new Date()]),
        DetailLevel.FULL, true, true
    );
    out.id = "new-event";

    out.onSave = note => note.replaceWith(getEmptyNote());

    return out;
}


let initializedEventsPanel = false;
/** Initializes the events panel */
export function initEventsPanel() {
    if (!initializedEventsPanel) {
        Loading.markLoadStart(initEventsPanel);
        
        // insert event calendar
        const eventCalendar = Placeholder.replaceWith("event-calendar", new EventCalendar(DB, new Date(), EventCalendar.Viewmode.MONTH));
        
        Placeholder.replaceWith("new-event", getEmptyNote());

        initializedEventsPanel = true;

        Loading.markLoadEnd(initEventsPanel);
    }
}