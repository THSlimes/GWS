import { FirestoreUserDatabase } from "../common/firebase/database/users/FirestoreUserDatabase";
import { redirectIfMissingPermission } from "../common/firebase/authentication/permission-based-redirect";
import { Permission, toHumanReadable } from "../common/firebase/database/Permission";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import "./header-and-footer";
import { showError, showMessage, showWarning } from "../common/ui/info-messages";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { UserInfo } from "../common/firebase/database/users/UserDatabase";
import { DATE_FORMATS } from "../common/util/DateUtil";
import { getStringColor } from "../common/util/ColorUtil";
import { DatabaseDataView } from "../common/DataView";

// only permitted users can view page
redirectIfMissingPermission("/", Permission.VIEW_ADMIN_PANEL, true, true);

/** Union type of the IDs of all panels. */
type PanelId = "accounts-panel" | "messages-panel" | "events-panel";

const PANEL_CONFIG:Record<PanelId, { icon:string, label:string, default?:true, selectFunct?:VoidFunction }> = {
    "accounts-panel": {
        icon: "group",
        label: "Accounts",
        selectFunct: initAccountsPanel
    },
    "events-panel": {
        icon: "calendar_month",
        label: "Activiteiten",
    },
    "messages-panel": {
        icon: "mail",
        label: "Berichten"
    }
};
Object.freeze(PANEL_CONFIG);



/**
 * Shows the panel with the given id, and hides all others.
 * @param id id of the panel to show
 */
function showPanel(id:PanelId) {
    Array.from(document.getElementsByClassName("panel")).forEach(e => {
        if (e instanceof HTMLElement) e.hidden = e.id !== id;
    });

    const initFunct = PANEL_CONFIG[id].selectFunct;
    if (initFunct) initFunct();
}

function createSectionButton(icon:string, label:string, id:PanelId, selected?:boolean):HTMLElement {
    return ElementFactory.div(undefined, "section-button", "click-action", "flex-columns", "main-axis-space-between")
        .children(
            ElementFactory.h4(icon).class("icon", "center-content"),
            ElementFactory.h4(label).class("center-content")
        )
        .attr("selected", selected ? "" : null)
        .on("click", (e, self) => {
            showPanel(id);
            Array.from(document.getElementsByClassName("section-button")).forEach(e => {
                if (e !== self) e.removeAttribute("selected");
            });
            self.setAttribute("selected", "");
        })
        .make();
}

window.addEventListener("DOMContentLoaded", () => { // insert section selectors
    const SECTION_SELECTOR = document.getElementById("section-selector") as HTMLDivElement;

    const ids = Object.keys(PANEL_CONFIG) as PanelId[];
    ids.sort((a,b) => PANEL_CONFIG[a].label.localeCompare(PANEL_CONFIG[b].label)); // sort alphabetically

    const defaultId = ids.find(id => PANEL_CONFIG[id].default) ?? ids[0];
    SECTION_SELECTOR.append(...ids.map(id => createSectionButton(PANEL_CONFIG[id].icon, PANEL_CONFIG[id].label, id, id === defaultId)));
    showPanel(defaultId);
});

// Panel-specific functionality

function createUserEntry(userInfo:UserInfo):HTMLElement {
    return ElementFactory.div(undefined, "entry")
        .children(
            ElementFactory.h4("content_copy")
                .class("id", "icon", "click-action", "center-content")
                .tooltip("Kopieer account-ID")
                .on("click", () => {
                    navigator.clipboard.writeText(userInfo.id)
                    .then(() => showMessage("Account ID gekopieerd."))
                    .catch(err => {
                        console.log(err);
                        showError("Kopiëren mislukt.");
                    });
                }),
            ElementFactory.h4(`${userInfo.first_name} ${userInfo.family_name}`)
                .class("name", "center-content"),
            ElementFactory.h4(DATE_FORMATS.DAY_AND_TIME.SHORT(userInfo.joined_at))
                .class("joined-at", "center-content"),
            ElementFactory.h4(userInfo.member_until ? DATE_FORMATS.DAY_AND_TIME.SHORT(userInfo.member_until) : "Geen lid")
                .class("member-until", "center-content"),
            ElementFactory.div(undefined, "permissions")
                .children(
                    ...userInfo.permissions.map(perm =>
                        ElementFactory.div(undefined, "permission", "center-content")
                            .children(
                                ElementFactory.p(toHumanReadable(perm)),
                                ElementFactory.p("close").class("icon", "click-action"),
                            )
                            .style({"background-color": getStringColor(perm)})
                    )
                )
        )
        .make();
}

let initializedAccountsPanel = false;
const usersDV = new DatabaseDataView(new FirestoreUserDatabase(), {}, true);
function initAccountsPanel() {
    if (!initializedAccountsPanel) {
        const usersList = document.querySelector("#accounts-list > .list") as HTMLDivElement;

        usersDV.onDataReady()
        .then(() => { // get data
            usersList.append(...usersDV.map(createUserEntry));
        });
    }
}

// let usersEdited = false;
// function initAccountsPanel() {
//     if (!initializedAccountsPanel) {
//         USER_DB.get() // get all users
//         .then(allUsers => {
//             usersList.append(...allUsers.map(createUserEntry));
//         })
//         .catch(err => showError(getErrorMessage(err)));
    
//         initializedAccountsPanel = true;
//     }
// }