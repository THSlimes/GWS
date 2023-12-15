export enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    
    // article related
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES",
    CREATE_ARTICLES = "CREATE_ARTICLES",
    UPDATE_ARTICLES = "UPDATE_ARTICLES",

    // event related
    REGISTER_FOR_EVENTS = "REGISTER_FOR_EVENTS",
    DEREGISTER_FOR_EVENTS = "DEREGISTER_FOR_EVENTS",

    // admin related
    VIEW_ADMIN_PANEL = "VIEW_ADMIN_PANEL"
}

export type PermissionGuarded = {
    needed_to_get?:Permission[],
    needed_to_list?:Permission[],
    needed_to_read?:Permission[],
    needed_to_create?:Permission[],
    needed_to_update?:Permission[],
    needed_to_delete?:Permission[],
    needed_to_write?:Permission[]
};