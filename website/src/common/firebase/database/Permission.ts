export enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES",
    VIEW_ADMIN_PANEL = "VIEW_ADMIN_PANEL"
}

export type PermissionGuarded = { required_permissions: Permission[] };