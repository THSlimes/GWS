import DataView, { DatabaseDataView } from "../DataView";
import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import FirestoreUserDatabase from "../firebase/database/users/FirestoreUserDatabase";
import { UserInfo } from "../firebase/database/users/UserDatabase";
import { onAuth } from "../firebase/init-firebase";
import ElementFactory from "../html-element-factory/ElementFactory";
import Responsive from "../ui/Responsive";
import UserFeedback from "../ui/UserFeedback";
import ArrayUtil from "../util/ArrayUtil";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import ObjectUtil from "../util/ObjectUtil";

/**
 * Creates a label that shows a single user permission.
 * @param perm Permission to show
 * @param editable whether it can be removed
 * @param onRemove callback for when remove button is pressed
 * @returns permission label
 */
function makePermissionLabel(perm:Permissions.Permission, editable:boolean, onRemove:(label:HTMLDivElement)=>void):HTMLDivElement {
    const backgroundColor = ColorUtil.getStringColor(perm);
    const color = ColorUtil.getMostContrasting(backgroundColor, "#000000", "#ffffff");
    return ElementFactory.div(undefined, "permission", "permission-label", "center-content")
        .children(
            ElementFactory.p(Permissions.translate(perm)).style({ color }),
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

/** Current timestamp. */
const NOW = new Date();
/** The Date after which registration is for the next year. */
const REGISTRATION_CUTOFF = new Date(`8-1-${NOW.getFullYear()}`);
/** The date at which membership starts/ends. */
const MEMBERSHIP_EXPIRY_DATE = "10-1";
/** Computes the date on which a new membership would expire. */
function getMembershipExtensionDate():Date {
    if (NOW < REGISTRATION_CUTOFF) return new Date(`${MEMBERSHIP_EXPIRY_DATE}-${NOW.getFullYear()}`); // is for this year
    else return new Date(`${MEMBERSHIP_EXPIRY_DATE}-${NOW.getFullYear() + 1}`); // is for next year
}

/**
 * Creates a list entry of the information of a single user.
 * @param userEntry user information as a DataView entry
 * @param canEdit whether any of the users information can be edited
 * @param canEditPerms whether the uses permission can be edited
 * @returns list entry with user information
 */
function makeUserEntry(userEntry:DataView.Entry<UserInfo>, canEdit:boolean, canEditPerms:boolean):HTMLElement {
    canEditPerms &&= canEdit; // can only edit permissions with edit permissions

    const out = ElementFactory.div(undefined, "entry").make();

    const joinedAtText = Responsive.isSlimmerOrEq(Responsive.Viewport.MOBILE_PORTRAIT) ? // don't show join time on mobile
        DateUtil.DATE_FORMATS.DAY.SHORT(userEntry.get("joined_at")) :
        DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("joined_at"));
    if (canEdit) out.append( // add editable versions
        ElementFactory.div(undefined, "name") // name
            .children(
                ElementFactory.input.text(userEntry.get("first_name"))
                    .placeholder("Voornaam")
                    .onValueChanged(val => userEntry.set("first_name", val)),
                ElementFactory.input.text(userEntry.get("family_name"))
                    .placeholder("Achternaam")
                    .onValueChanged(val => userEntry.set("family_name", val)),
            )
            .make(),
        ElementFactory.h4(joinedAtText) // join date
            .class("joined-at", "center-content")
            .make(),
        (userEntry.get("member_until").getTime() <= Date.now()) ? // membership status
            ElementFactory.iconButton( // show button to make user a member
                "add_card",
                () => {
                    userEntry.set("member_until", getMembershipExtensionDate()); // edit membership date
                    userEntry.set("permissions", [...Permissions.PRESETS.Lid]); // add member permissions
                    out.replaceWith(makeUserEntry(userEntry, canEdit, canEditPerms));
                }, "Maak lid")
                .class("member-until", "text-center")
                .make() :
            ElementFactory.div(undefined, "member-until", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.input.dateTimeLocal(userEntry.get("member_until")) // membership expiration date
                        .onValueChanged(val => userEntry.set("member_until", new Date(val)))
                        .make(),
                    ElementFactory.iconButton("more_time", () => { // button to extend membership to next year
                        const memberUntil = userEntry.get("member_until");
                        memberUntil.setFullYear(memberUntil.getFullYear() + 1, 9, 1);
                        userEntry.set("member_until", memberUntil);
                        out.replaceWith(makeUserEntry(userEntry, canEdit, canEditPerms));
                    }, "Lidmaatschap verlengen")
                )
                .make()
    );
    else out.append( // add non-editable versions
        ElementFactory.h4(`${userEntry.get("first_name")} ${userEntry.get("family_name")}`) // name
            .class("name", "center-content")
            .make(),
        ElementFactory.h4(joinedAtText) // join date
            .class("joined-at", "center-content")
            .make(),
        ElementFactory.h4(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(userEntry.get("member_until"))) // membership status
            .class("member-until", "center-content")
            .make()
    );
    

    out.prepend( // id copier
        ElementFactory.iconButton("content_copy", () => {
            navigator.clipboard.writeText(userEntry.get("id"))
            .then(() => UserFeedback.success("Account ID gekopieerd."))
            .catch(err => {
                console.error(err);
                UserFeedback.error("Kopiëren mislukt, probeer het later opnieuw.");
            });
        }, "Kopieer account-ID").class("id", "text-center").make()
    );

    // list of permissions
    const permissionsList = out.appendChild(ElementFactory.div(undefined, "permissions", "permissions-list")
        .children(
            canEditPerms && ElementFactory.div(undefined, "preset-selector", "flex-columns", "cross-axis-center", "in-section-gap") // preset selector
                .children(
                    ElementFactory.p("interests").class("icon", "no-margin"),
                    ElementFactory.select(ObjectUtil.keys(Permissions.PRESETS))
                        .option("Andere", "Andere", true).value(Permissions.getPreset(userEntry.get("permissions")) ?? "Andere")
                        .onValueChanged(val => {
                            if (val !== "Andere") {
                                const preset = Permissions.PRESETS[val];
                                const userPerms = userEntry.set("permissions", [...preset]);
                                Array.from(permissionsList.getElementsByClassName("permission-label")).forEach(label => label.remove());
                                out.replaceWith(makeUserEntry(userEntry, canEdit, canEditPerms));
                            }
                        })
                        .make(),
                )
                .tooltip("Groep"),
            ...userEntry.get("permissions").sort((a, b) => Permissions.translate(a).localeCompare(Permissions.translate(b))) // permission labels
                .map(perm => makePermissionLabel(perm, canEditPerms, label => {
                    const userPerms = userEntry.get("permissions");
                    userPerms.splice(userPerms.indexOf(perm), 1);
                    userEntry.set("permissions", userPerms);
                    out.replaceWith(makeUserEntry(userEntry, canEdit, canEditPerms));
                })),
            canEditPerms && userEntry.get("permissions").length < Permissions.ALL.length ?
                ElementFactory.select(ObjectUtil.mapToObject(ArrayUtil.difference(Permissions.ALL, userEntry.get("permissions")), p => Permissions.translate(p))) // new permission selector
                    .option("null", "+", true).value("null")
                    .class("new-permission", "button")
                    .onValueChanged(perm => {
                        if (perm !== "null") {
                            const userPerms = userEntry.get("permissions");
                            userPerms.push(perm);
                            userEntry.set("permissions", userPerms);
                            out.replaceWith(makeUserEntry(userEntry, canEdit, canEditPerms));
                        }
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
/** Filter options based on membership */
type MembershipFilterOption = "members-only" | "non-members-only" | "both";
let MEMBERSHIP_FILTER_SELECT:HTMLSelectElement & { value:MembershipFilterOption };
/** Filter options based on permissions */
type PermissionFilterOption = Permissions.Permission | "any";
let PERMISSION_FILTER_SELECT:HTMLSelectElement & { value:PermissionFilterOption };
/** User sorting options */
type UserSortOption = "name-asc" | "name-desc" | "created-at-asc" | "created-at-desc" | "member-until-asc" | "member-until-desc" | "num-permissions-asc" | "num-permissions-desc";
let USER_SORT_SELECT:HTMLSelectElement & { value:UserSortOption };

let initializedUsersPanel = false;
const USERS_DV = new DatabaseDataView(new FirestoreUserDatabase(), {}, true);
/** Initializes the users panel. */
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
        for (const perm of Permissions.ALL) { // adding options to select
            PERMISSION_FILTER_SELECT.options.add(ElementFactory.option().value(perm).text(Permissions.translate(perm)).make());
        }

        USERS_LIST = document.querySelector("#users-list > .list") as HTMLDivElement;

        refreshUserEntries();

        const usersSaveButton = document.getElementById("users-save-button") as HTMLButtonElement;
        USERS_DV.onDataModified = () => usersSaveButton.disabled = false;
        usersSaveButton.addEventListener("click", () => {
            USERS_DV.save()
            .then(() => {
                usersSaveButton.disabled = true;
                UserFeedback.success("Wijzigingen opgeslagen!");
            })
            .catch(err => UserFeedback.error(getErrorMessage(err)));
        });
        
        initializedUsersPanel = true;

        

        window.addEventListener("beforeunload", ev => {
            if (!ev.defaultPrevented && USERS_DV.isDataModified) ev.preventDefault();
        });
    }
}

/** Adds the user entries to the list of all users. */
function refreshUserEntries() {

    Promise.all([onAuth(), USERS_DV.onDataReady()])
    .then(([user, _]) => {
        checkPermissions([
            Permissions.Permission.UPDATE_OWN_USER_INFO,
            Permissions.Permission.UPDATE_OWN_PERMISSIONS,
            Permissions.Permission.UPDATE_OTHER_USER_INFO,
            Permissions.Permission.UPDATE_OTHER_USER_PERMISSIONS
        ])
        .then(hasPerms => {
            while (USERS_LIST.childElementCount > 1) USERS_LIST.lastElementChild!.remove();
            
            const filteredSubset = USERS_DV.filter(matchesFilter);
            sortUsers(filteredSubset);

            USERS_LIST.append(...filteredSubset.map((u,i) =>
                makeUserEntry(
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

/**
 * Determines whether the given user entry matches the current filter.
 * @param entry user entry
 * @returns true if entry matches (false otherwise)
 */
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

/**
 * Sorts the given user entries based on the selected sorting option.
 * @param entries array of user entries
 * @returns sorted user entries
 */
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

    throw new Error(`unknown sorting method: "${USER_SORT_SELECT.value}"`); // failsafe
}