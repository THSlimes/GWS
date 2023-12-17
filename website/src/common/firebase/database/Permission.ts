/**
 * A Permission represents the ability for a user to perform
 * certain actions or to have access to protected data.
 */
export enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    
    // article related
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES", // whether the user can read articles exclusive to members
    CREATE_ARTICLES = "CREATE_ARTICLES", // whether the user can create new articles
    UPDATE_ARTICLES = "UPDATE_ARTICLES", // whether the user can update preexisting articles

    // event related
    CREATE_EVENT = "CREATE_EVENT", // whether the user can create a new event
    UPDATE_EVENT = "UPDATE_EVENTS", // whether the user can update the details of a preexisting event
    REGISTER_FOR_EVENTS = "REGISTER_FOR_EVENTS", // whether the user is allowed to register for an event
    DEREGISTER_FOR_EVENTS = "DEREGISTER_FOR_EVENTS", // whether the user is allowed to deregister for an event

    // user related
    READ_OTHER_USER_INFO = "READ_OTHER_USER_INFO", // whether the user is allowed to see details of other users
    UPDATE_OTHER_USER_INFO = "UPDATE_OTHER_USER_INFO", // whether the user can update the details of other users

    // admin related
    VIEW_ADMIN_PANEL = "VIEW_ADMIN_PANEL", // whether the user has access to the administration panel
}

/**
 * Represents database documents for which someone needs extra permission
 * to perform certain actions.
 */
export type PermissionGuarded = {
    needed_to_get?:Permission[],
    needed_to_list?:Permission[],
    needed_to_read?:Permission[],
    needed_to_create?:Permission[],
    needed_to_update?:Permission[],
    needed_to_delete?:Permission[],
    needed_to_write?:Permission[]
};