import Cache from "../Cache";
import ConditionedCharSequenceEditor from "../custom-elements/ConditionedCharSequenceEditor";
import Placeholder from "../custom-elements/Placeholder";
import FirestoreSettingsDatabase from "../firebase/database/settings/FirestoreSettingsDatabase";
import Loading from "../Loading";
import UserFeedback from "../ui/UserFeedback";

let SEQUENCE_EDITOR:ConditionedCharSequenceEditor;

const DB = new FirestoreSettingsDatabase();

let initializedLoadingScreensPanel = false;
/** Initializes the panel for idea box submissions. */
export function initLoadingScreensPanel() {
    if (!initializedLoadingScreensPanel) {
        Loading.useDynamicContent(DB.getLoadingScreenConfig(), config => {
            SEQUENCE_EDITOR = Placeholder.replaceWith("loading-screens-editor", new ConditionedCharSequenceEditor(config));

            const saveButton = document.getElementById("loading-screens-save-button") as HTMLButtonElement;
            saveButton.addEventListener("click", () => {
                saveButton.disabled = true;
                const newConfig = SEQUENCE_EDITOR.value;
                DB.setLoadingScreenConfig(newConfig)
                .then(() => {
                    UserFeedback.success("Wijzigingen opgeslagen! Het kan tot zes uur duren voordat anderen de wijzigingen zien.");
                    Cache.set("loading-screen-config", newConfig);
                })
                .finally(() => saveButton.disabled = false);
            });
        });

        initializedLoadingScreensPanel = true;
    }
}