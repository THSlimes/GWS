import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, doc, documentId, getCountFromServer, getDocs, limit, query, where, writeBatch } from "@firebase/firestore";
import Permission from "../Permission";
import UserDatabase, { UserQueryFilter, UserInfo } from "./UserDatabase";
import { DB } from "../../init-firebase";
import Cache from "../../../Cache";

/** A user as they're stored in the database. */
type DBUser = {
    joined_at:Timestamp,
    member_until:Timestamp,
    first_name:string,
    family_name:string,
    permissions:Permission[]
};

const USER_CONVERTER:FirestoreDataConverter<UserInfo, DBUser> = {
    toFirestore(user:UserInfo):DBUser {
        return {
            ...user,
            joined_at: Timestamp.fromDate(user.joined_at),
            member_until: Timestamp.fromDate(user.member_until)
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DBUser, UserInfo>):UserInfo {
        const data = snapshot.data();
        return new UserInfo(
            snapshot.id,
            data.joined_at.toDate(),
            data.member_until.toDate(),
            data.first_name,
            data.family_name,
            data.permissions ?? []
        );
    }
}

export class FirestoreUserDatabase extends UserDatabase {

    private static readonly COLLECTION = collection(DB, "users").withConverter(USER_CONVERTER);

    get(options:UserQueryFilter = {}): Promise<UserInfo[]> {
        return FirestoreUserDatabase.getUsers({...options});
    }

    count(options?: UserQueryFilter | undefined): Promise<number> {
        return FirestoreUserDatabase.getUsers({...options}, true);
    }
    
    getById(id: string): Promise<UserInfo | undefined> {
        return new Promise((resolve, reject) => {
            FirestoreUserDatabase.getUsers({limit:1, id})
            .then(users => resolve(users.length > 0 ? users[0] : undefined))
            .catch(reject);
        });
    }

    public doWrite(...records: UserInfo[]): Promise<number> {
        return new Promise((resolve,reject) => {
            const batch = writeBatch(DB);
            for (const rec of records) batch.set(doc(DB, "users", rec.id), USER_CONVERTER.toFirestore(rec));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
    }

    public doDelete(...records:UserInfo[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const batch = writeBatch(DB);
            for (const rec of records) batch.delete(doc(DB, "users", rec.id));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
    }

    private static getUsers(options: UserQueryFilter, doCount?: false): Promise<UserInfo[]>;
    private static getUsers(options: UserQueryFilter, doCount?: true): Promise<number>;
    private static getUsers(options:UserQueryFilter, doCount=false):Promise<UserInfo[]|number> {
        const constraints:QueryConstraint[] = [];

        // general
        if (options.limit) constraints.push(limit(options.limit));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        // user-specific
        if (options.has_permission) constraints.push(where("permissions","array-contains",options.has_permission));
        if (options.is_member) constraints.push(where("member_until", ">=", Timestamp.now()));
        if (options.joined_after) constraints.push(where("joined_at", ">", Timestamp.fromDate(options.joined_after)));
        if (options.joined_before) constraints.push(where("joined_at", "<", Timestamp.fromDate(options.joined_before)));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreUserDatabase.COLLECTION, ...constraints); // create query
            if (doCount) getCountFromServer(q) // get count
                .then(res => resolve(res.data().count))
                .catch(reject);
            else getDocs(q)
                .then(snapshot => { // get documents
                    const out: UserInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    // save permissions into cache
                    out.forEach(user => Cache.set(`permissions-${user.id}`, user.permissions));
                    resolve(out);
                })
                .catch(reject);
        });
    }

}