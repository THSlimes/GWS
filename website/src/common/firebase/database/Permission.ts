import { FirestoreArticleDatabase } from "./FirestoreArticleDatabase";

enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES"
}
export type PermissionGuarded = { required_permissions: Permission[] };