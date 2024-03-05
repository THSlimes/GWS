import Cache from "../Cache";
import Loading from "../Loading";
import ImagedLinksEditor from "../custom-elements/ImagedLinksEditor";
import LinkTreeEditor from "../custom-elements/LinkTreeEditor";
import Placeholder from "../custom-elements/Placeholder";
import getErrorMessage from "../firebase/authentication/error-messages";
import FirestoreSettingsDatabase from "../firebase/database/settings/FirestoreSettingsDatabase";
import { showError, showSuccess } from "../ui/info-messages";

let initializedLinksPanel = false;
const SETTINGS_DB = new FirestoreSettingsDatabase();

let NAVBAR_LINKS_EDITOR:LinkTreeEditor;
let NAVBAR_LINKS_SAVE_BUTTON:HTMLButtonElement;

let SPONSOR_LINKS_EDITOR:ImagedLinksEditor;
let SPONSOR_LINKS_SAVE_BUTTON:HTMLButtonElement;

let SOCIAL_MEDIA_LINKS_EDITOR:ImagedLinksEditor;
let SOCIAL_MEDIA_LINKS_SAVE_BUTTON:HTMLButtonElement;

export function initLinksPanel() {
    if (!initializedLinksPanel) {
        Loading.markLoadStart(initLinksPanel);

        // Navbar links
        SETTINGS_DB.getNavbarLinks()
        .then(links => {
            NAVBAR_LINKS_EDITOR = Placeholder.replaceWith("navbar-links", LinkTreeEditor.fromLinkTree(links));
        })
        .catch(err => showError(getErrorMessage(err)));

        NAVBAR_LINKS_SAVE_BUTTON = document.getElementById("navbar-links-save-button") as HTMLButtonElement;
        NAVBAR_LINKS_SAVE_BUTTON.addEventListener("click", () => {
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

        // Sponsor links
        SETTINGS_DB.getSponsorLinks()
        .then(links => {
            SPONSOR_LINKS_EDITOR = Placeholder.replaceWith("sponsor-links", new ImagedLinksEditor(links));
        })
        .catch(err => showError(getErrorMessage(err)));

        SPONSOR_LINKS_SAVE_BUTTON = document.getElementById("sponsor-links-save-button") as HTMLButtonElement;
        SPONSOR_LINKS_SAVE_BUTTON.addEventListener("click", () => {
            try {
                const newLinks = SPONSOR_LINKS_EDITOR.value;

                SETTINGS_DB.setSponsorLinks(newLinks)
                .then(() => {
                    showSuccess("Wijzigingen opgeslagen! Het kan even duren voordat anderen de wijzigingen zien.");
                    Cache.remove("sponsor-links"); // clear own cache
                })
                .catch(err => showError(err));
            }
            catch (err) {
                if (err instanceof Error) showError(err.message);
                else showError(getErrorMessage(err));
            }
        });

        // Social media links
        SETTINGS_DB.getSocialMediaLinks()
        .then(links => {
            SOCIAL_MEDIA_LINKS_EDITOR = Placeholder.replaceWith("social-media-links", new ImagedLinksEditor(links));
        })
        .catch(err => showError(getErrorMessage(err)));

        SOCIAL_MEDIA_LINKS_SAVE_BUTTON = document.getElementById("social-media-links-save-button") as HTMLButtonElement;
        SOCIAL_MEDIA_LINKS_SAVE_BUTTON.addEventListener("click", () => {
            try {
                const newLinks = SOCIAL_MEDIA_LINKS_EDITOR.value;

                SETTINGS_DB.setSocialMediaLinks(newLinks)
                .then(() => {
                    showSuccess("Wijzigingen opgeslagen! Het kan even duren voordat anderen de wijzigingen zien.");
                    Cache.remove("social-media-links"); // clear own cache
                })
                .catch(err => showError(err));
            }
            catch (err) {
                if (err instanceof Error) showError(err.message);
                else showError(getErrorMessage(err));
            }
        });

        initializedLinksPanel = true;
        Loading.markLoadEnd(initLinksPanel);
    }
}