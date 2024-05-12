import EventCalendar from "../custom-elements/EventCalendar";
import Placeholder from "../custom-elements/Placeholder";
import "../custom-elements/Switch";
import "../custom-elements/FolderElement";
import CachingEventDatabase from "../firebase/database/events/CachingEventDatabase";
import FirestoreEventDatebase from "../firebase/database/events/FirestoreEventDatabase";
import { EventInfo } from "../firebase/database/events/EventDatabase";
import StringUtil from "../util/StringUtil";
import { EditableEventNote } from "../custom-elements/EventNote";
import { DetailLevel } from "../util/UtilTypes";
import Loading from "../Loading";
import ColorListEditor from "../custom-elements/ColorListEditor";
import FirestoreSettingsDatabase from "../firebase/database/settings/FirestoreSettingsDatabase";
import Cache from "../Cache";
import ElementFactory from "../html-element-factory/ElementFactory";
import UserFeedback from "../ui/UserFeedback";
import getErrorMessage from "../firebase/authentication/error-messages";

const EVENT_DB = new CachingEventDatabase(new FirestoreEventDatebase());
const SETTINGS_DB = new FirestoreSettingsDatabase();

/** Creates an EditableEventNote for new events (is added to database upon saving) */
function getEmptyNote():EditableEventNote {
    const out = new EditableEventNote( // placeholder into
        new EventInfo(EVENT_DB, StringUtil.generateID(), "", "", "", [new Date(), new Date()], []),
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
        const eventCalendar = Placeholder.replaceWith("event-calendar", new EventCalendar(EVENT_DB, new Date(), EventCalendar.Viewmode.MONTH));

        // default color editor
        Loading.useDynamicContent(SETTINGS_DB.getDefaultCategoryColors(), colors => {
                const defaultColorEditor = new ColorListEditor(colors);
                Placeholder.replaceWith("default-category-color-editor", defaultColorEditor);

                defaultColorEditor.after(
                    ElementFactory.button((_, self) => {
                        SETTINGS_DB.setDefaultCategoryColors(defaultColorEditor.value)
                        .then(() => {
                            Cache.remove("default-category-colors");
                            UserFeedback.success("Wijzigingen opgeslagen! Het kan tot zes uur duren voordat anderen de wijzigingen zien.");
                        })
                        .catch(err => UserFeedback.error(getErrorMessage(err)));
                    })
                    .children(
                        ElementFactory.h4("Kleuren opslaan").class("no-margin"),
                        ElementFactory.h4("save").class("icon", "no-margin")
                    )
                    .style({ width: "max-content" })
                    .make()
                );
            }
        );
        
        Placeholder.replaceWith("new-event", getEmptyNote());

        initializedEventsPanel = true;

        Loading.markLoadEnd(initEventsPanel);
    }
}