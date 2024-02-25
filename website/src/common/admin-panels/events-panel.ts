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

const DB = new CachingEventDatebase(new FirestoreEventDatebase());

function getEmptyNote():EditableEventNote {
    const out = new EditableEventNote(
        new EventInfo(DB, StringUtil.generateID(), "", "", "", undefined, [new Date(), new Date()]),
        DetailLevel.FULL, true, true
    );
    out.id = "new-event";

    out.onSave = note => note.replaceWith(getEmptyNote());

    return out;
}


let initializedEventsPanel = false;
export function initEventsPanel() {
    if (!initializedEventsPanel) {
        const eventCalendar = Placeholder.replaceWith("event-calendar", new EventCalendar(DB, new Date(), "month"));
        
        
        Placeholder.replaceWith("new-event", getEmptyNote());

        initializedEventsPanel = true;
    }
}