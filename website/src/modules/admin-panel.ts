import { FirestoreUserDatabase } from "../common/firebase/database/users/FirestoreUserDatabase";
import { checkPermissions, redirectIfMissingPermission } from "../common/firebase/authentication/permission-based-redirect";
import Permission, { ALL_PERMISSIONS, toHumanReadable } from "../common/firebase/database/Permission";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import "./header-and-footer";
import { showError, showMessage, showSuccess, showWarning } from "../common/ui/info-messages";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { UserInfo } from "../common/firebase/database/users/UserDatabase";
import { DATE_FORMATS } from "../common/util/DateUtil";
import { getStringColor } from "../common/util/ColorUtil";
import DataView, { DatabaseDataView } from "../common/DataView";
import { mapToObject } from "../common/util/ObjectUtil";
import { difference } from "../common/util/ArrayUtil";
import { onAuth } from "../common/firebase/init-firebase";

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

function createPermissionLabel(perm:Permission, editable:boolean, onRemove:(label:HTMLDivElement)=>void):HTMLDivElement {
    return ElementFactory.div(undefined, "permission", "center-content")
        .children(
            ElementFactory.p(toHumanReadable(perm)),
            label => editable ?
                ElementFactory.p("close")
                    .class("icon", "click-action")
                    .on("click", () => onRemove(label)) :
                null,
        )
        .style({"background-color": getStringColor(perm)})
        .make();
}

function createUserEntry(userEntry:DataView.Entry<UserInfo>, canEdit:boolean, canEditPerms:boolean):HTMLElement {
    canEditPerms &&= canEdit; // can only edit permissions with edit permissions

    const out = ElementFactory.div(undefined, "entry").make();

    if (canEdit) out.append( // add editable versions
        ElementFactory.div(undefined, "name")
            .children(
                ElementFactory.input.text(userEntry.get("first_name"))
                    .placeholder("Voornaam")
                    .onValueChanged(val => userEntry.set("first_name", val)),
                ElementFactory.input.text(userEntry.get("family_name"))
                    .placeholder("Achternaam")
                    .onValueChanged(val => userEntry.set("family_name", val)),
            )
            .make(),
        ElementFactory.h4(DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at")))
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.input.dateTimeLocal(userEntry.get("member_until"))
            .onValueChanged(val => userEntry.set("member_until", new Date(val)))
            .make()
    );
    else out.append( // add non-editable versions
        ElementFactory.h4(`${userEntry.get("first_name")} ${userEntry.get("family_name")}`)
            .class("name", "center-content")
            .make(),
        ElementFactory.h4(DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at")))
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.h4(userEntry.get("member_until") ? DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("member_until")!) : "Geen lid")
            .class("member-until", "center-content")
            .make()
        
    );

    out.prepend( // id copier
        ElementFactory.h4("content_copy")
            .class("id", "icon", "click-action", "center-content")
            .tooltip("Kopieer account-ID")
            .on("click", () => {
                navigator.clipboard.writeText(userEntry.get("id"))
                .then(() => showMessage("Account ID gekopieerd."))
                .catch(err => {
                    console.log(err);
                    showError("Kopiëren mislukt.");
                });
            })
            .make()
    );
    out.appendChild( // permissions list
        ElementFactory.div(undefined, "permissions")
            .children(
                ...userEntry.get("permissions").sort((a,b) => toHumanReadable(a).localeCompare(toHumanReadable(b)))
                    .map(perm => createPermissionLabel(perm, canEditPerms, label => {
                        const userPerms = userEntry.get("permissions");
                        userPerms.splice(userPerms.indexOf(perm), 1);
                        userEntry.set("permissions", userPerms);
                        out.replaceWith(createUserEntry(userEntry, canEdit, canEditPerms));
                    })),
                canEditPerms && userEntry.get("permissions").length < ALL_PERMISSIONS.length ?
                    ElementFactory.select(mapToObject(difference(ALL_PERMISSIONS, userEntry.get("permissions")), p => toHumanReadable(p)))
                        .option("null", "+", true).value("null")
                        .class("new-permission", "button")
                        .onValueChanged(v => {
                            const perm = v as Permission;
                            const userPerms = userEntry.get("permissions");
                            userPerms.push(perm);
                            userEntry.set("permissions", userPerms);
                            out.replaceWith(createUserEntry(userEntry, canEdit, canEditPerms));
                        }) :
                    null // non-editable or all permissions granted
            )
            .make()
    );
    
    return out;
}

let initializedAccountsPanel = false;
const USERS_DV = new DatabaseDataView(new FirestoreUserDatabase(), {}, true);
function initAccountsPanel() {
    if (!initializedAccountsPanel) {
        const usersList = document.querySelector("#accounts-list > .list") as HTMLDivElement;

        Promise.all([
            USERS_DV.onDataReady(),
            onAuth(),
            new Promise<boolean>((resolve,reject) => checkPermissions(Permission.EDIT_OWN_USER_INFO, resolve, false)),
            new Promise<boolean>((resolve,reject) => checkPermissions(Permission.EDIT_OWN_PERMISSIONS, resolve, false)),
            new Promise<boolean>((resolve,reject) => checkPermissions(Permission.EDIT_OTHER_USER_INFO, resolve, false)),
            new Promise<boolean>((resolve,reject) => checkPermissions(Permission.EDIT_OTHER_USER_PERMISSIONS, resolve, false))
        ])
        .then(([_, user, canEditSelf, canEditOwnPerms, canEditOthers, canEditOthersPerms]) => { // get data
            usersList.append(...USERS_DV.map((u,i) =>
                createUserEntry(u, u.get("id") === user!.uid ? canEditSelf : canEditOthers, u.get("id") === user!.uid ? canEditOwnPerms : canEditOthersPerms)));
        });

        const usersSaveButton = document.getElementById("users-save-button") as HTMLButtonElement;
        USERS_DV.onDataModified = () => usersSaveButton.disabled = false;
        usersSaveButton.addEventListener("click", () => {
            USERS_DV.save()
            .then(() => {
                usersSaveButton.disabled = true;
                showSuccess("Aanpassingen opgeslagen.");
            })
            .catch(err => showError(getErrorMessage(err)));
        });
        
        initializedAccountsPanel = true;
    }
}