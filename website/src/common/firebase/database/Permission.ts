export enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES",
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