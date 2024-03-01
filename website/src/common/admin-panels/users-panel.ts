import DataView, { DatabaseDataView } from "../DataView";
import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission, { ALL_PERMISSIONS, toHumanReadable } from "../firebase/database/Permission";
import { FirestoreUserDatabase } from "../firebase/database/users/FirestoreUserDatabase";
import { UserInfo } from "../firebase/database/users/UserDatabase";
import { onAuth } from "../firebase/init-firebase";
import ElementFactory from "../html-element-factory/ElementFactory";
import Responsive from "../ui/Responsive";
import { showError, showMessage, showSuccess } from "../ui/info-messages";
import ArrayUtil from "../util/ArrayUtil";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import ObjectUtil from "../util/ObjectUtil";

function createPermissionLabel(perm:Permission, editable:boolean, onRemove:(label:HTMLDivElement)=>void):HTMLDivElement {
    const backgroundColor = ColorUtil.getStringColor(perm);
    const color = ColorUtil.getMostContrasting(backgroundColor, "#000000", "#ffffff");
    return ElementFactory.div(undefined, "permission", "center-content")
        .children(
            ElementFactory.p(toHumanReadable(perm)).style({ color }),
            label => editable ?
                ElementFactory.p("close")
                    .class("icon", "click-action")
                    .style({ color })
                    .on("click", () => onRemove(label)) :
                null,
        )
        .style({ backgroundColor })
        .make();
}

function createUserEntry(userEntry:DataView.Entry<UserInfo>, canEdit:boolean, canEditPerms:boolean):HTMLElement {
    canEditPerms &&= canEdit; // can only edit permissions with edit permissions

    const out = ElementFactory.div(undefined, "entry").make();

    const joinedAtText = Responsive.isAnyOf("mobile-portrait") ? // don't show join time on mobile
        DateUtil.DATE_FORMATS.DAY.SHORT(userEntry.get("joined_at")) :
        DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at"));
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
        ElementFactory.h4(joinedAtText)
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.input.dateTimeLocal(userEntry.get("member_until"))
            .class("member-until")
            .onValueChanged(val => userEntry.set("member_until", new Date(val)))
            .make()
    );
    else out.append( // add non-editable versions
        ElementFactory.h4(`${userEntry.get("first_name")} ${userEntry.get("family_name")}`)
            .class("name", "center-content")
            .make(),
        ElementFactory.h4(joinedAtText)
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.h4(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("member_until")!))
            .class("member-until", "center-content")
            .make()
        
    );
    

    out.prepend( // id copier
        ElementFactory.iconButton("content_copy", () => {
            navigator.clipboard.writeText(userEntry.get("id"))
            .then(() => showSuccess("Account ID gekopieerd."))
            .catch(err => {
                console.log(err);
                showError("Kopiëren mislukt, probeer het later opnieuw.");
            });
        }, "Kopieer account-ID").class("id", "text-center").make()
    );


    out.appendChild(ElementFactory.div(undefined, "permissions", "permissions-list") // permissions list
        .children(
            ...userEntry.get("permissions").sort((a, b) => toHumanReadable(a).localeCompare(toHumanReadable(b)))
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

let USERS_LIST:HTMLDivElement;

let FILTER_FORM:HTMLDivElement;
let NAME_FILTER_INPUT:HTMLInputElement;
type MembershipFilterOption = "members-only" | "non-members-only" | "both";
let MEMBERSHIP_FILTER_SELECT:HTMLSelectElement & { value:MembershipFilterOption };
type PermissionFilterOption = Permission | "any";
let PERMISSION_FILTER_SELECT:HTMLSelectElement & { value:PermissionFilterOption };
type UserSortOption = "name-asc" | "name-desc" | "created-at-asc" | "created-at-desc" | "member-until-asc" | "member-until-desc" | "num-permissions-asc" | "num-permissions-desc";
let USER_SORT_SELECT:HTMLSelectElement & { value:UserSortOption };

let initializedUsersPanel = false;
const USERS_DV = new DatabaseDataView(new FirestoreUserDatabase(), {}, true);
export function initUsersPanel() {
    if (!initializedUsersPanel) {

        // user list filters
        FILTER_FORM = document.getElementById("users-search-options") as HTMLDivElement;
        NAME_FILTER_INPUT = document.getElementById("users-filter-name") as HTMLInputElement;
        MEMBERSHIP_FILTER_SELECT = document.getElementById("users-filter-membership-status") as HTMLSelectElement & { value:MembershipFilterOption };
        PERMISSION_FILTER_SELECT = document.getElementById("users-filter-permissions") as HTMLSelectElement & { value:PermissionFilterOption };
        USER_SORT_SELECT = document.getElementById("users-filter-sort") as HTMLSelectElement & { value:UserSortOption };

        FILTER_FORM.addEventListener("input", () => refreshUserEntries());
        FILTER_FORM.addEventListener("change", () => refreshUserEntries());

        PERMISSION_FILTER_SELECT.options.add(ElementFactory.option().value("any").text("").make());
        for (const perm of ALL_PERMISSIONS) { // adding options to select
            PERMISSION_FILTER_SELECT.options.add(ElementFactory.option().value(perm).text(toHumanReadable(perm)).make());
        }

        USERS_LIST = document.querySelector("#users-list > .list") as HTMLDivElement;

        refreshUserEntries();

        const usersSaveButton = document.getElementById("users-save-button") as HTMLButtonElement;
        USERS_DV.onDataModified = () => usersSaveButton.disabled = false;
        usersSaveButton.addEventListener("click", () => {
            USERS_DV.save()
            .then(() => {
                usersSaveButton.disabled = true;
                showSuccess("Wijzigingen opgeslagen!");
            })
            .catch(err => showError(getErrorMessage(err)));
        });
        
        initializedUsersPanel = true;

    }
}

function refreshUserEntries() {
    

    Promise.all([onAuth(), USERS_DV.onDataReady()])
    .then(([user, _]) => {
        checkPermissions([
            Permission.UPDATE_OWN_USER_INFO,
            Permission.UPDATE_OWN_PERMISSIONS,
            Permission.UPDATE_OTHER_USER_INFO,
            Permission.UPDATE_OTHER_USER_PERMISSIONS
        ])
        .then(hasPerms => {
            while (USERS_LIST.childElementCount > 1) USERS_LIST.lastElementChild!.remove();
            
            const filteredSubset = USERS_DV.filter(matchesFilter);
            sortUsers(filteredSubset);

            USERS_LIST.append(...filteredSubset.map((u,i) =>
                createUserEntry(
                    u,
                    u.get("id") === user!.uid ? hasPerms.UPDATE_OWN_USER_INFO : hasPerms.UPDATE_OTHER_USER_INFO,
                    u.get("id") === user!.uid ? hasPerms.UPDATE_OWN_PERMISSIONS : hasPerms.UPDATE_OTHER_USER_PERMISSIONS
                ))
            );
        })
        .catch(console.error)
    })
    .catch(console.error);
}

function matchesFilter(entry:DataView.Entry<UserInfo>):boolean {
    const fullName = `${entry.get("first_name")} ${entry.get("family_name")}`.toLocaleLowerCase().trim();
    if (!fullName.includes(NAME_FILTER_INPUT.value.toLocaleLowerCase().trim())) return false;

    const membershipOption = MEMBERSHIP_FILTER_SELECT.value;
    if (membershipOption === "members-only" && entry.get("member_until") < new Date()) return false;
    else if (membershipOption === 'non-members-only' && entry.get("member_until") >= new Date()) return false;

    const permissionOption = PERMISSION_FILTER_SELECT.value;
    if (permissionOption !== "any" && !entry.get("permissions").includes(permissionOption)) return false;

    return true;
}

function sortUsers(entries:DataView.Entry<UserInfo>[]):DataView.Entry<UserInfo>[] {
    switch (USER_SORT_SELECT.value) {
        case "name-asc": return entries.sort((a,b) => {
            const aFullName = `${a.get("first_name")} ${a.get("family_name")}`;
            const bFullName = `${b.get("first_name")} ${b.get("family_name")}`;
            return aFullName.localeCompare(bFullName);
        });
        case "name-desc": return entries.sort((a,b) => {
            const aFullName = `${a.get("first_name")} ${a.get("family_name")}`;
            const bFullName = `${b.get("first_name")} ${b.get("family_name")}`;
            return bFullName.localeCompare(aFullName);
        });
        case "created-at-asc": return entries.sort((a,b) => a.get("joined_at").getTime() - b.get("joined_at").getTime());
        case "created-at-desc": return entries.sort((a,b) => b.get("joined_at").getTime() - a.get("joined_at").getTime());
        case "member-until-asc": return entries.sort((a,b) => a.get("member_until").getTime() - b.get("member_until").getTime());
        case "member-until-desc": return entries.sort((a,b) => b.get("member_until").getTime() - a.get("member_until").getTime());
        case "num-permissions-asc": return entries.sort((a,b) => a.get("permissions").length - b.get("permissions").length);
        case "num-permissions-desc": return entries.sort((a,b) => b.get("permissions").length - a.get("permissions").length);
    }

    throw new Error(`unknown sorting method: "${USER_SORT_SELECT.value}"`);
}