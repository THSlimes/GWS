import { getFirestore } from "@firebase/firestore";
import Database from "../../Database";
import FIREBASE_APP from "../init-firebase";
import { FirestoreArticleDatabase } from "./FirestoreArticleDatabase";

export const DB = getFirestore(FIREBASE_APP); // initialize Firebase Firestore

enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES"
}
export type PermissionGuarded = { required_permissions: Permission[] };



export default class FirestoreDatabase implements Database {
    
    public readonly articles = new FirestoreArticleDatabase();

}