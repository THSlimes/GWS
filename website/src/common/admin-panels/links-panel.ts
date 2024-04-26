import Cache from "../Cache";
import Loading from "../Loading";
import ImagedLinksEditor from "../custom-elements/ImagedLinksEditor";
import LinkTreeEditor from "../custom-elements/LinkTreeEditor";
import Placeholder from "../custom-elements/Placeholder";
import getErrorMessage from "../firebase/authentication/error-messages";
import FirestoreSettingsDatabase from "../firebase/database/settings/FirestoreSettingsDatabase";
import UserFeedback from "../ui/UserFeedback";

let initializedLinksPanel = false;
const SETTINGS_DB = new FirestoreSettingsDatabase();

let NAVBAR_LINKS_EDITOR:LinkTreeEditor;

let SPONSOR_LINKS_EDITOR:ImagedLinksEditor;

let SOCIAL_MEDIA_LINKS_EDITOR:ImagedLinksEditor;

/** Initializes the links panel. */
export function initLinksPanel() {
    if (!initializedLinksPanel) {
        Loading.markLoadStart(initLinksPanel);

        const elements = Loading.getElementsById({ // getting buttons from page
            "navbar-links-save-button": HTMLButtonElement,
            "sponsor-links-save-button": HTMLButtonElement,
            "social-media-links-save-button": HTMLButtonElement
        });

        // Navbar links
        SETTINGS_DB.getNavbarLinks()
        .then(links => NAVBAR_LINKS_EDITOR = Placeholder.replaceWith("navbar-links", LinkTreeEditor.fromLinkTree(links)))
        .catch(err => UserFeedback.error(getErrorMessage(err)));

        elements["navbar-links-save-button"].addEventListener("click", () => { // saving
            try {
                const newLinks = NAVBAR_LINKS_EDITOR.value;

                SETTINGS_DB.setNavbarLinks(newLinks)
                .then(() => {
                    UserFeedback.success("Wijzigingen opgeslagen! Het kan tot zes uur duren voordat anderen de wijzigingen zien.");
                    Cache.remove("navbar-links"); // clear own cache
                    NAVBAR_LINKS_EDITOR.save();
                })
                .catch(err => UserFeedback.error(err));
            }
            catch (err) {
                if (err instanceof Error) UserFeedback.error(err.message);
                else UserFeedback.error(getErrorMessage(err));
            }
        });

        // Sponsor links
        SETTINGS_DB.getSponsorLinks()
        .then(links => {
            SPONSOR_LINKS_EDITOR = Placeholder.replaceWith("sponsor-links", new ImagedLinksEditor(links));
        })
        .catch(err => UserFeedback.error(getErrorMessage(err)));

        elements["sponsor-links-save-button"].addEventListener("click", () => { // saving
            try {
                const newLinks = SPONSOR_LINKS_EDITOR.value;

                SETTINGS_DB.setSponsorLinks(newLinks)
                .then(() => {
                    UserFeedback.success("Wijzigingen opgeslagen! Het kan tot zes uur duren voordat anderen de wijzigingen zien.");
                    Cache.remove("sponsor-links"); // clear own cache
                    SPONSOR_LINKS_EDITOR.save();
                })
                .catch(err => UserFeedback.error(err));
            }
            catch (err) {
                if (err instanceof Error) UserFeedback.error(err.message);
                else UserFeedback.error(getErrorMessage(err));
            }
        });

        // Social media links
        SETTINGS_DB.getSocialMediaLinks()
        .then(links => {
            SOCIAL_MEDIA_LINKS_EDITOR = Placeholder.replaceWith("social-media-links", new ImagedLinksEditor(links));
        })
        .catch(err => UserFeedback.error(getErrorMessage(err)));

        elements["social-media-links-save-button"].addEventListener("click", () => { // saving
            try {
                const newLinks = SOCIAL_MEDIA_LINKS_EDITOR.value;

                SETTINGS_DB.setSocialMediaLinks(newLinks)
                .then(() => {
                    UserFeedback.success("Wijzigingen opgeslagen! Het kan tot zes uur duren voordat anderen de wijzigingen zien.");
                    Cache.remove("social-media-links"); // clear own cache
                    SOCIAL_MEDIA_LINKS_EDITOR.save();
                })
                .catch(err => UserFeedback.error(err));
            }
            catch (err) {
                if (err instanceof Error) UserFeedback.error(err.message);
                else UserFeedback.error(getErrorMessage(err));
            }
        });

        initializedLinksPanel = true;
        Loading.markLoadEnd(initLinksPanel);


        // unsaved changes warning
        window.addEventListener("beforeunload", ev => {
            if (!ev.defaultPrevented && (
                NAVBAR_LINKS_EDITOR.isDataModified ||
                SPONSOR_LINKS_EDITOR.isDataModified ||
                SOCIAL_MEDIA_LINKS_EDITOR.isDataModified
            )) ev.preventDefault();
        });
    }
}