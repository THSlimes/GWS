import Cache from "../Cache";
import LinkTreeEditor from "../custom-elements/LinkTreeEditor";
import Placeholder from "../custom-elements/Placeholder";
import getErrorMessage from "../firebase/authentication/error-messages";
import FirestoreSettingsDatabase from "../firebase/database/settings/FirestoreSettingsDatabase";
import { showError, showSuccess } from "../ui/info-messages";

let initializedLinksPanel = false;
const SETTINGS_DB = new FirestoreSettingsDatabase();

let LINKS_SAVE_BUTTON:HTMLInputElement;
let NAVBAR_LINKS_EDITOR:LinkTreeEditor;

export function initLinksPanel() {
    if (!initializedLinksPanel) {
        SETTINGS_DB.getNavbarLinks()
        .then(links => {
            NAVBAR_LINKS_EDITOR = Placeholder.replaceWith("navbar-links", LinkTreeEditor.fromLinkTree(links));
        })
        .catch(err => showError(getErrorMessage(err)));

        LINKS_SAVE_BUTTON = document.getElementById("links-save-button") as HTMLInputElement;
        LINKS_SAVE_BUTTON.addEventListener("click", () => {
            try {
                const newLinks = NAVBAR_LINKS_EDITOR.value;

                SETTINGS_DB.setNavbarLinks(newLinks)
                .then(() => {
                    showSuccess("Wijzigingen opgeslagen! Het kan even duren voordat anderen de wijzigingen zien.");
                    Cache.remove("navbar-links"); // clear own cache
                })
                .catch(err => showError(err));
            }
            catch (err) {
                if (err instanceof Error) showError(err.message);
                else showError(getErrorMessage(err));
            }
        });

        initializedLinksPanel = true;
    }
}