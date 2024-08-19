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
import StringUtil from "../util/StringUtil";

/**
 * Creates a label that shows a single user permission.
 * @param perm Permission to show
 * @param editable whether it can be removed
 * @param onRemove callback for when remove button is pressed
 * @returns permission label
 */
function makePermissionLabel(perm: Permissions.Permission, editable: boolean, onRemove: (label: HTMLDivElement) => void): HTMLDivElement {
    const backgroundColor = ColorUtil.getStringColor(perm);
    return ElementFactory.div(undefined, "permission", "permission-label", "center-content")
        .children(
            ElementFactory.p(Permissions.translate(perm)),
            label => editable ?
                ElementFactory.p("close")
                    .class("icon", "click-action")
                    .on("click", () => onRemove(label)) :
                null,
        )
        .onMake(self => {
            ColorUtil.getStringColor(perm, ColorUtil.PALETTES.RAINBOW)
                .then(bgColor => {
                    const textColor = ColorUtil.getMostContrasting(bgColor, "#233452", "#ffffff");

                    self.style.backgroundColor = bgColor;
                    self.childNodes.forEach(cn => {
                        if (cn instanceof HTMLElement) cn.style.color = textColor;
                    });
                })
                .catch(err => UserFeedback.error(getErrorMessage(err)));
        })
        .make();
}

/** Current timestamp. */
const NOW = new Date();
/** The Date after which registration is for the next year. */
const REGISTRATION_CUTOFF = new Date(`8-1-${NOW.getFullYear()}`);
/** The date at which membership starts/ends. */
const MEMBERSHIP_EXPIRY_DATE = "10-1";
/** Computes the date on which a new membership would expire. */
function getMembershipExtensionDate(): Date {
    if (NOW < REGISTRATION_CUTOFF) return new Date(`${MEMBERSHIP_EXPIRY_DATE}-${NOW.getFullYear()}`); // is for this year
    else return new Date(`${MEMBERSHIP_EXPIRY_DATE}-${NOW.getFullYear() + 1}`); // is for next year
}

const minTimestamp = new Date("0001-01-01T00:00:00Z");
const maxTimestamp = new Date("9999-12-31T23:59:59.999999999Z");


const PERMISSION_GROUPING: Record<string, Permissions.Permission[]> = {
    "Accounts": [
        Permissions.Permission.UPDATE_OWN_USER_INFO,
        Permissions.Permission.UPDATE_OWN_PERMISSIONS,
        Permissions.Permission.READ_OTHER_USER_INFO,
        Permissions.Permission.UPDATE_OTHER_USER_INFO,
        Permissions.Permission.UPDATE_OTHER_USER_PERMISSIONS
    ],
    "Activiteiten": [
        Permissions.Permission.CREATE_EVENTS,
        Permissions.Permission.UPDATE_EVENTS,
        Permissions.Permission.DELETE_EVENTS,
        Permissions.Permission.REGISTER_FOR_EVENTS,
        Permissions.Permission.DEREGISTER_FOR_EVENTS,
        Permissions.Permission.READ_EVENT_COMMENTS
    ],
    "Administratie": [
        Permissions.Permission.UPDATE_SETTINGS,
        Permissions.Permission.VIEW_ADMIN_PANEL
    ],
    "Berichten": [
        Permissions.Permission.READ_MEMBER_ARTICLES,
        Permissions.Permission.CREATE_ARTICLES,
        Permissions.Permission.UPDATE_ARTICLES,
        Permissions.Permission.DELETE_ARTICLES,
        Permissions.Permission.UPLOAD_FILES,
        Permissions.Permission.DOWNLOAD_PROTECTED_FILES
    ],
    "Ideeënbox": [
        Permissions.Permission.CREATE_IDEA_BOX_SUBMISSIONS,
        Permissions.Permission.READ_IDEA_BOX_SUBMISSIONS
    ]
};

/**
 * Creates a list entry of the information of a single user.
 * @param userEntry user information as a DataView entry
 * @param canEdit whether any of the users information can be edited
 * @param canEditPerms whether the uses permission can be edited
 * @returns list entry with user information
 */
function makeUserEntry(userEntry: DataView.Entry<UserInfo>, canEdit: boolean, canEditPerms: boolean): HTMLElement {
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
                    ElementFactory.input.date(userEntry.get("member_until"), minTimestamp, maxTimestamp) // membership expiration date
                        .onValueChanged(val => {
                            const date = new Date(val);
                            if (DateUtil.Timestamps.isValid(date)) userEntry.set("member_until", DateUtil.Timestamps.clamp(date, minTimestamp, maxTimestamp));
                        })
                        .on("change", (_, self) => {
                            const date = new Date(self.value);
                            if (DateUtil.Timestamps.isValid(date)) userEntry.set("member_until", DateUtil.Timestamps.clamp(date, minTimestamp, maxTimestamp));
                            DateUtil.Timestamps.setInputValue(self, userEntry.get("member_until"));
                        })
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
                ElementFactory.select<Permissions.Permission>()
                    .option("null", '+', true).value("null")
                    .class("new-permission", "button")
                    .children(
                        ...ObjectUtil.mapToArray(PERMISSION_GROUPING, (groupName, groupPerms) => {
                            const grantableGroupPerms = groupPerms.filter(p => !userEntry.get("permissions").includes(p));
                            if (grantableGroupPerms.length === 0) return null;
                            else return ElementFactory.optgroup(groupName)
                                .children(
                                    ...grantableGroupPerms.map(p => ElementFactory.option(p).text(Permissions.translate(p)))
                                );
                        }))
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

let USERS_LIST: HTMLDivElement;

let FILTER_FORM: HTMLDivElement;
let NAME_FILTER_INPUT: HTMLInputElement;
/** Filter options based on membership */
type MembershipFilterOption = "members-only" | "non-members-only" | "both";
let MEMBERSHIP_FILTER_SELECT: HTMLSelectElement & { value: MembershipFilterOption };
/** Filter options based on permissions */
type PermissionFilterOption = Permissions.Permission | "any";
let PERMISSION_FILTER_SELECT: HTMLSelectElement & { value: PermissionFilterOption };
let PERMISSION_PRESET_FILTER_SELECT: HTMLSelectElement & { value: Permissions.PresetName | "any" };
/** User sorting options */
type UserSortOption = "name-asc" | "name-desc" | "created-at-asc" | "created-at-desc" | "member-until-asc" | "member-until-desc" | "num-permissions-asc" | "num-permissions-desc";
let USER_SORT_SELECT: HTMLSelectElement & { value: UserSortOption | "any" };

let initializedUsersPanel = false;
const USERS_DV = new DatabaseDataView(new FirestoreUserDatabase(), {}, true);
/** Initializes the users panel. */
export function initUsersPanel() {
    if (!initializedUsersPanel) {

        // user list filters
        FILTER_FORM = document.getElementById("users-search-options") as HTMLDivElement;
        NAME_FILTER_INPUT = document.getElementById("users-filter-name") as HTMLInputElement;
        MEMBERSHIP_FILTER_SELECT = document.getElementById("users-filter-membership-status") as HTMLSelectElement & { value: MembershipFilterOption };
        PERMISSION_FILTER_SELECT = document.getElementById("users-filter-permissions") as HTMLSelectElement & { value: PermissionFilterOption };
        PERMISSION_PRESET_FILTER_SELECT = document.getElementById("users-filter-permission-preset") as HTMLSelectElement & { value: Permissions.PresetName };
        USER_SORT_SELECT = document.getElementById("users-filter-sort") as HTMLSelectElement & { value: UserSortOption };

        FILTER_FORM.addEventListener("input", () => refreshUserEntries());
        FILTER_FORM.addEventListener("change", () => refreshUserEntries());

        PERMISSION_FILTER_SELECT.options.add(ElementFactory.option().value("any").text("").make());
        for (const perm of Permissions.ALL) { // adding options to select
            PERMISSION_FILTER_SELECT.options.add(ElementFactory.option().value(perm).text(Permissions.translate(perm)).make());
        }

        PERMISSION_PRESET_FILTER_SELECT.options.add(ElementFactory.option().value("any").text("").make());
        for (const presetName of ObjectUtil.keys(Permissions.PRESETS)) { // adding options to select
            PERMISSION_PRESET_FILTER_SELECT.options.add(ElementFactory.option().value(presetName).text(presetName).make());
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

                    USERS_LIST.append(...filteredSubset.map((u, i) =>
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
function matchesFilter(entry: DataView.Entry<UserInfo>): boolean {
    // filter name
    const fullName = StringUtil.normalize(`${entry.get("first_name")} ${entry.get("family_name")}`);
    const nameQuery = StringUtil.normalize(NAME_FILTER_INPUT.value);
    if (!fullName.includes(nameQuery) && !nameQuery.includes(fullName)) return false;

    // filter membership status
    const membershipOption = MEMBERSHIP_FILTER_SELECT.value;
    if (membershipOption === "members-only" && entry.get("member_until") < new Date()) return false;
    else if (membershipOption === 'non-members-only' && entry.get("member_until") >= new Date()) return false;

    // filter given permission
    const permissionOption = PERMISSION_FILTER_SELECT.value;
    if (permissionOption !== "any" && !entry.get("permissions").includes(permissionOption)) return false;

    // filter on permission preset
    const permissionPresetOption = PERMISSION_PRESET_FILTER_SELECT.value;
    if (permissionPresetOption !== "any") {
        const matchingPreset = Permissions.getPreset(entry.get("permissions"));
        if (matchingPreset !== permissionPresetOption) return false;
    }

    return true;
}

/**
 * Sorts the given user entries based on the selected sorting option.
 * @param entries array of user entries
 * @returns sorted user entries
 */
function sortUsers(entries: DataView.Entry<UserInfo>[]): DataView.Entry<UserInfo>[] {
    switch (USER_SORT_SELECT.value) {
        case "name-asc": return entries.sort((a, b) => {
            const aFullName = `${a.get("first_name")} ${a.get("family_name")}`;
            const bFullName = `${b.get("first_name")} ${b.get("family_name")}`;
            return aFullName.localeCompare(bFullName);
        });
        case "name-desc": return entries.sort((a, b) => {
            const aFullName = `${a.get("first_name")} ${a.get("family_name")}`;
            const bFullName = `${b.get("first_name")} ${b.get("family_name")}`;
            return bFullName.localeCompare(aFullName);
        });
        case "created-at-asc": return entries.sort((a, b) => a.get("joined_at").getTime() - b.get("joined_at").getTime());
        case "created-at-desc": return entries.sort((a, b) => b.get("joined_at").getTime() - a.get("joined_at").getTime());
        case "member-until-asc": return entries.sort((a, b) => a.get("member_until").getTime() - b.get("member_until").getTime());
        case "member-until-desc": return entries.sort((a, b) => b.get("member_until").getTime() - a.get("member_until").getTime());
        case "num-permissions-asc": return entries.sort((a, b) => a.get("permissions").length - b.get("permissions").length);
        case "num-permissions-desc": return entries.sort((a, b) => b.get("permissions").length - a.get("permissions").length);
    }

    throw new Error(`unknown sorting method: "${USER_SORT_SELECT.value}"`); // failsafe
}