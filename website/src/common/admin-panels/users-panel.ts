import DataView, { DatabaseDataView } from "../DataView";
import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission, { ALL_PERMISSIONS, toHumanReadable } from "../firebase/database/Permission";
import { FirestoreUserDatabase } from "../firebase/database/users/FirestoreUserDatabase";
import { UserInfo } from "../firebase/database/users/UserDatabase";
import { onAuth } from "../firebase/init-firebase";
import ElementFactory from "../html-element-factory/ElementFactory";
import { showError, showMessage, showSuccess } from "../ui/info-messages";
import ArrayUtil from "../util/ArrayUtil";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import ObjectUtil from "../util/ObjectUtil";

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
        .style({"background-color": ColorUtil.getStringColor(perm)})
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
        ElementFactory.h4(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at")))
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
        ElementFactory.h4(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at")))
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.h4(userEntry.get("member_until") ? DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("member_until")!) : "Geen lid")
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
                    ElementFactory.select(ObjectUtil.mapToObject(ArrayUtil.difference(ALL_PERMISSIONS, userEntry.get("permissions")), p => toHumanReadable(p)))
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
export function initAccountsPanel() {
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