import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, query, where, writeBatch } from "@firebase/firestore";
import Permissions from "../Permissions";
import UserDatabase, { UserQueryFilter, UserInfo } from "./UserDatabase";
import { FIRESTORE } from "../../init-firebase";
import Cache from "../../../Cache";
import ArrayUtil from "../../../util/ArrayUtil";

const USER_CONVERTER:FirestoreDataConverter<UserInfo, FirestoreUserDatabase.User> = {
    toFirestore(user:UserInfo):FirestoreUserDatabase.User {
        return {
            ...user,
            joined_at: Timestamp.fromDate(user.joined_at),
            member_until: Timestamp.fromDate(user.member_until)
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreUserDatabase.User, UserInfo>):UserInfo {
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

class FirestoreUserDatabase extends UserDatabase {

    private static readonly COLLECTION = collection(FIRESTORE, "users").withConverter(USER_CONVERTER);

    get(options:UserQueryFilter = {}): Promise<UserInfo[]> {
        return FirestoreUserDatabase.getUsers({...options});
    }

    count(options?: UserQueryFilter | undefined): Promise<number> {
        return FirestoreUserDatabase.getUsers({...options}, true);
    }
    
    getById(id: string): Promise<UserInfo|undefined> {
        const docRef = doc(FirestoreUserDatabase.COLLECTION, id);
        return getDoc(docRef)
            .then(snapshot => snapshot.exists() ? snapshot.data() : undefined);
    }

    /** @see https://firebase.google.com/docs/firestore/query-data/queries#query_limitations */
    private static MAX_BATCH_SIZE = 30;
    getByIds<S extends string>(...ids: S[]): Promise<{[id in S]?: UserInfo}> {
        if (ids.length === 1) {
            return this.getById(ids[0])
                .then(userInfo => {
                    const out:{[id in S]?: UserInfo} = {};
                    if (userInfo) out[ids[0]] = userInfo;
                    return out;
                });
        }
        else {
            const batches = ArrayUtil.batch(ids, FirestoreUserDatabase.MAX_BATCH_SIZE);
            const queries = batches.map(batch => query(FirestoreUserDatabase.COLLECTION, where(documentId(), "in", batch)));

            return Promise.all(queries.map(q => getDocs(q)))
                .then(snapshots => {
                    const out:{[id in S]?: UserInfo} = {};

                    for (const snapshot of snapshots) {
                        snapshot.forEach(docSnapshot => {
                            const userInfo = docSnapshot.data();
                            out[userInfo.id as S] = userInfo;
                        });
                    }

                    return out;
                });
        }
    }

    public doWrite(...records: UserInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) batch.set(doc(FIRESTORE, "users", rec.id), USER_CONVERTER.toFirestore(rec));
        return batch.commit()
            .then(() => records.length);
    }

    public doDelete(...records:UserInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) batch.delete(doc(FIRESTORE, "users", rec.id));
        return batch.commit()
            .then(() => records.length);
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

        const q = query(FirestoreUserDatabase.COLLECTION, ...constraints); // create query
        return doCount ?
            getCountFromServer(q) // get count
            .then(res => res.data().count) :
            getDocs(q)
            .then(snapshot => { // get documents
                const out: UserInfo[] = [];
                snapshot.forEach(doc => out.push(doc.data()));
                
                out.forEach(user => Cache.set(`permissions-${user.id}`, user.permissions)); // save permissions into cache
                return out;
            })
            .catch(err => {
                console.log("failed to get user", options, err);
                return err;
            });
    }

}

namespace FirestoreUserDatabase {
    /** A user as they're stored in the database. */
    export type User = {
        joined_at:Timestamp,
        member_until:Timestamp,
        first_name:string,
        family_name:string,
        permissions:Permissions.Permission[]
    };

}

export default FirestoreUserDatabase;