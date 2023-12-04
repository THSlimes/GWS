import { QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, documentId, getCountFromServer, getDocs, limit, query, where } from "@firebase/firestore";
import { Permission } from "../Permission";
import UserDatabase, { UserFilterOptions, UserInfo } from "./UserDatabase";
import { DB } from "../../init-firebase";
import { clamp } from "../../../util/NumberUtil";

/** A user as they're stored in the database. */
type DBUser = {
    joined_at:Timestamp,
    member_until?:Timestamp,
    first_name:string,
    family_name:string,
    permissions:Permission[]
};

export class FirestoreUserDatabase extends UserDatabase {

    private static readonly COLLECTION = collection(DB, "users").withConverter({
        toFirestore(user:UserInfo):DBUser {
            return {
                ...user,
                joined_at: Timestamp.fromDate(user.joined_at),
                member_until: user.member_until ? Timestamp.fromDate(user.member_until) : undefined
            }
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DBUser, UserInfo>):UserInfo {
            const data = snapshot.data();
            return new UserInfo(
                snapshot.id,
                data.joined_at.toDate(),
                data.member_until?.toDate(),
                data.first_name,
                data.family_name,
                data.permissions ?? []
            );
        }
    });

    get(limit: number, options?: Omit<UserFilterOptions, "limit"> | undefined): Promise<UserInfo[]> {
        return FirestoreUserDatabase.getUsers({limit, ...options});
    }

    count(options?: UserFilterOptions | undefined): Promise<number> {
        return FirestoreUserDatabase.getUsers({...options}, true);
    }
    
    getById(id: string): Promise<UserInfo | undefined> {
        return new Promise((resolve, reject) => {
            FirestoreUserDatabase.getUsers({limit:1, id})
            .then(users => resolve(users.length > 0 ? users[0] : undefined))
            .catch(reject);
        });
    }

    private static getUsers(options: UserFilterOptions, doCount?: false): Promise<UserInfo[]>;
    private static getUsers(options: UserFilterOptions, doCount?: true): Promise<number>;
    private static getUsers(options:UserFilterOptions, doCount=false):Promise<UserInfo[]|number> {
        const constraints:QueryConstraint[] = [];

        // general
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        // user-specific
        if (options.has_permission) constraints.push(where("permissions","array-contains",options.has_permission));
        if (options.is_member) constraints.push(where("member_until", ">=", Timestamp.now()));
        if (options.joined_after) constraints.push(where("joined_at", ">", Timestamp.fromDate(options.joined_after)));
        if (options.joined_before) constraints.push(where("joined_at", "<", Timestamp.fromDate(options.joined_before)));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreUserDatabase.COLLECTION, ...constraints); // create query
            try {
                if (doCount) resolve((await getCountFromServer(q)).data().count); // get count
                else { // get documents
                    const snapshot = await getDocs(q);
                    const out: UserInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    resolve(out);
                }
            }
            catch (e) { reject(e); }
        });
    }

}