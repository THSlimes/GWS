/**
 * A Permission represents the ability for a user to perform
 * certain actions or to have access to protected data.
 */
enum Permission {
    // article related
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES", // whether the user can read articles exclusive to members
    CREATE_ARTICLES = "CREATE_ARTICLES", // whether the user can create new articles
    UPDATE_ARTICLES = "UPDATE_ARTICLES", // whether the user can update preexisting articles
    DELETE_ARTICLES = "DELETE_ARTICLES", // whether the user can delete articles
    UPLOAD_FILES = "UPLOAD_FILES", // whether the user can upload a new attachment
    DOWNLOAD_PROTECTED_FILES = "DOWNLOAD_PROTECTED_FILES", // whether the user is allowed to download a protected file

    // event related
    CREATE_EVENTS = "CREATE_EVENTS", // whether the user can create a new event
    UPDATE_EVENTS = "UPDATE_EVENTS", // whether the user can update the details of a preexisting event
    DELETE_EVENTS = "DELETE_EVENTS", // whether the user can delete events
    REGISTER_FOR_EVENTS = "REGISTER_FOR_EVENTS", // whether the user is allowed to register for an event
    DEREGISTER_FOR_EVENTS = "DEREGISTER_FOR_EVENTS", // whether the user is allowed to deregister for an event

    // user related
    READ_OWN_USER_INFO = "READ_OWN_USER_INFO", // whether the user has access to their own info
    UPDATE_OWN_USER_INFO = "UPDATE_OWN_USER_INFO", // whether the user can edit their own info
    UPDATE_OWN_PERMISSIONS = "UPDATE_OWN_PERMISSIONS", // whether the user can edit their own permissions

    READ_OTHER_USER_INFO = "READ_OTHER_USER_INFO", // whether the user is allowed to see details of other users
    UPDATE_OTHER_USER_INFO = "UPDATE_OTHER_USER_INFO", // whether the user can update the details of other users
    UPDATE_OTHER_USER_PERMISSIONS = "UPDATE_OTHER_USER_PERMISSIONS", // whether the user can edit the permissions of others

    // admin related
    VIEW_ADMIN_PANEL = "VIEW_ADMIN_PANEL", // whether the user has access to the administration panel
}
export default Permission;

export const ALL_PERMISSIONS = Object.values(Permission);
Object.freeze(ALL_PERMISSIONS);

const PERMISSION_TRANSLATIONS:Record<Permission,string> = {
    [Permission.READ_MEMBER_ARTICLES]: "Berichten voor leden lezen",
    [Permission.CREATE_ARTICLES]: "Berichten plaatsen",
    [Permission.DELETE_ARTICLES]: "Berichten verwijderen",
    [Permission.UPDATE_ARTICLES]: "Berichten bewerken",
    
    [Permission.UPLOAD_FILES]: "Bestanden uploaden",
    [Permission.DOWNLOAD_PROTECTED_FILES]: "Beveiligde bestanden downloaden",

    [Permission.CREATE_EVENTS]: "Activiteiten toevoegen",
    [Permission.UPDATE_EVENTS]: "Activiteit-info bewerken",
    [Permission.DELETE_EVENTS]: "Activiteiten verwijderen",
    [Permission.REGISTER_FOR_EVENTS]: "Inschrijven voor activiteiten",
    [Permission.DEREGISTER_FOR_EVENTS]: "Uitschrijven van activiteiten ",

    [Permission.READ_OWN_USER_INFO]: "Account-info van henzelf lezen",
    [Permission.UPDATE_OWN_USER_INFO]: "Account-info van henzelf bewerken",
    [Permission.UPDATE_OWN_PERMISSIONS]: "Account-machtigingen van henzelf bewerken",

    [Permission.READ_OTHER_USER_INFO]: "Account-info van anderen zien",
    [Permission.UPDATE_OTHER_USER_INFO]: "Account-info van anderen bewerken",
    [Permission.UPDATE_OTHER_USER_PERMISSIONS]: "Account-machtigingen van anderen bewerken",

    [Permission.VIEW_ADMIN_PANEL]: "Administratie-paneel zien",
};

export function toHumanReadable(perm:Permission) {
    const out = PERMISSION_TRANSLATIONS[perm];
    if (out === undefined) throw new Error(`unknown permission: "${perm}"`);
    else return out;
}