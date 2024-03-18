import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, deleteField, doc, documentId, getCountFromServer, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "@firebase/firestore";
import EventDatabase, { EventQueryFilter, RegisterableEventInfo, EventInfo, EventComment } from "./EventDatabase";
import { FIRESTORE, onAuth } from "../../init-firebase";
import { FirebaseError } from "firebase/app";
import FirestoreUserDatabase from "../users/FirestoreUserDatabase";
import ColorUtil from "../../../util/ColorUtil";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Any event longer than (in ms) this may be queried incorrectly. */
const MAX_EVENT_DURATION = 7 * MS_PER_DAY;

function toFirestore(event:EventInfo):FirestoreEventDatebase.Event {
    return event instanceof RegisterableEventInfo ? {
        name: event.name,
        description: event.description,
        category: event.category,
        ...(event.color && { color: event.color }),
        registrations: event.registrations,
        requires_payment: event.requires_payment,
        ...(event.capacity && { capacity: event.capacity }),
        starts_at: Timestamp.fromDate(event.starts_at),
        ends_at: Timestamp.fromDate(event.ends_at),
        ...(event.can_register_from && { can_register_from: event.can_register_from }),
        ...(event.can_register_until && { can_register_until: event.can_register_until })
    } : {
        name: event.name,
        description: event.description,
        category: event.category,
        ...(event.color && { color: event.color }),
        starts_at: Timestamp.fromDate(event.starts_at),
        ends_at: Timestamp.fromDate(event.ends_at)
    };
}

function createConverter(db:EventDatabase):FirestoreDataConverter<EventInfo|RegisterableEventInfo,FirestoreEventDatebase.Event> {
    return {
        toFirestore,
        fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreEventDatebase.Event, EventInfo>):EventInfo {
            const data = snapshot.data();

            if ("registrations" in data) return new RegisterableEventInfo(
                db,
                snapshot.id,
                data.name,
                data.description,
                data.category,
                data.color,
                [data.starts_at.toDate(), data.ends_at.toDate()],
                data.registrations,
                data.requires_payment,
                data.capacity,
                [data.can_register_from?.toDate(), data.can_register_until?.toDate()]
            );
            else return new EventInfo(
                db,
                snapshot.id,
                data.name,
                data.description,
                data.category,
                data.color,
                [data.starts_at.toDate(), data.ends_at.toDate()]
            );
        }
    };
}

/**
 * A FirestoreEventDatabase provides an interface to interact with event data in a
 * remote FireStore database.
*/
class FirestoreEventDatebase extends EventDatabase {

    private readonly converter = createConverter(this);
    private readonly collection = collection(FIRESTORE, "events").withConverter(this.converter);

    get(options:EventQueryFilter = {}) {
        return this.getEvents(options);
    }

    count(options:EventQueryFilter = {}): Promise<number> {
        return this.getEvents(options, true);
    }

    getRange(from?: Date, to?: Date, options?: Omit<EventQueryFilter, "range">): Promise<EventInfo[]> {
        from ??= new Date(-8640000000000000);
        to ??= new Date(8640000000000000);
        return this.getEvents({range: {from, to}, ...options});
    }

    getById(id: string): Promise<EventInfo | undefined> {
        return new Promise<EventInfo|undefined>((resolve, reject) => {
            const docRef = doc(this.collection, id);
            getDoc(docRef)
            .then(snapshot => {
                if (snapshot.exists()) resolve(snapshot.data());
                else resolve(undefined);
            })
            .catch(reject);
        });
    }
    
    getByCategory(category: string, options?: Omit<EventQueryFilter, "category"> | undefined): Promise<EventInfo[]> {
        return this.getEvents({category, ...options});
    }

    private static USER_DB = new FirestoreUserDatabase();
    registerFor(event:RegisterableEventInfo, comment?:string): Promise<[string,string]> {
        return new Promise((resolve,reject) => {
            onAuth() // get logged in user
            .then(user => {
                if (user === null) reject(new FirebaseError("unauthenticated", "Not logged in."));
                else FirestoreEventDatebase.USER_DB.getById(user.uid) // get user info
                .then(userInfo => {
                    if (userInfo) {
                        const batch = writeBatch(FIRESTORE);

                        batch.update(doc(this.collection, event.id), { [`registrations.${user.uid}`]: userInfo.fullName });

                        if (comment) {
                            const dbComment:FirestoreEventDatebase.Comment = {
                                body: comment,
                                created_at: Timestamp.now()
                            };
                            batch.set(doc(FIRESTORE, "events", event.id, "comments", user.uid), dbComment);
                        }

                        batch.commit()
                        .then(() => resolve([user.uid, userInfo.fullName]))
                        .catch(reject);
                    }
                    else reject(new Error(`no user info found for id "${user.uid}"`)); // user not found
                })
                .catch(reject);
            })
            .catch(reject);
        });
    }

    deregisterFor(event:RegisterableEventInfo): Promise<string> {
        return new Promise((resolve,reject) => {
            onAuth()
            .then(user => {
                if (user === null) reject(new FirebaseError("unauthenticated", "Not logged in."));
                else {
                    const batch = writeBatch(FIRESTORE);
                    // remove from registrations field
                    batch.update(doc(this.collection, event.id), { [`registrations.${user.uid}`]: deleteField() });
                    // remove comment
                    batch.delete(doc(this.collection, event.id, "comments", user.uid));

                    batch.commit()
                    .then(() => {
                        delete event.registrations[user.uid];
                        resolve(user.uid);
                    })
                    .catch(reject);
                }
            })
            .catch(reject);
        });
    }

    getCommentsFor(event: RegisterableEventInfo): Promise<Record<string,EventComment>> {
        return new Promise((resolve, reject) => {
            const commentCollection = collection(FIRESTORE, "events", event.id, "comments");
            getDocs(commentCollection)
            .then(snapshot => {
                const out:Record<string,EventComment> = {};
                snapshot.forEach(docSnapshot => {
                    const data = docSnapshot.data() as FirestoreEventDatebase.Comment;
                    out[docSnapshot.id] = { id:docSnapshot.id, created_at: data.created_at.toDate(), body: data.body };
                });

                resolve(out);
            })
            .catch(reject);
        });
    }

    public doWrite(...records: EventInfo[]): Promise<number> {
        return new Promise((resolve,reject) => {
            const batch = writeBatch(FIRESTORE);
            for (const rec of records) batch.set(doc(FIRESTORE, "events", rec.id), toFirestore(rec));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
    }

    public doDelete(...records: EventInfo[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const batch = writeBatch(FIRESTORE);
            for (const rec of records) batch.delete(doc(FIRESTORE, "events", rec.id));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
    }

    private getEvents(options: EventQueryFilter, doCount?: false): Promise<EventInfo[]>;
    private getEvents(options: EventQueryFilter, doCount?: true): Promise<number>;
    private getEvents(options: EventQueryFilter, doCount = false): Promise<EventInfo[] | number> {
        const baseConstraints:QueryConstraint[] = [];

        // generic
        if (options.id !== undefined) baseConstraints.push(where(documentId(), "==", options.id));
        if (options.limit !== undefined) baseConstraints.push(limit(options.limit));
        if (options.notId !== undefined) baseConstraints.push(where(documentId(), "!=", options.notId));

        // specific
        if (options.category !== undefined) baseConstraints.push(where("category", "==", options.category));
        
        // the conjunctive parts of a DNF query
        let rangeConstraints:QueryConstraint[][] = [];
        if (options.range) {
            if (options.range.from && options.range.to) rangeConstraints.push(
                [where("starts_at", ">=", options.range.from), where("starts_at", "<=", options.range.to)],
                [where("ends_at", ">=", options.range.from), where("ends_at", "<=", options.range.to)]
            );
            else if (options.range.from) rangeConstraints.push([where("ends_at", ">=", options.range.from)]);
            else rangeConstraints.push([where("starts_at", "<=", options.range.to)]);
        }
        else rangeConstraints.push([]);

        return new Promise(async (resolve, reject) => {
            const queries = rangeConstraints.map(rc => query(this.collection, ...rc, ...baseConstraints));

            if (doCount && queries.length === 1) getCountFromServer(queries[0])
                .then(res => resolve(res.data().count))
                .catch(reject);
            else Promise.all(queries.map(q => getDocs(q)))
                .then(snapshots => {
                    let out:Record<string, EventInfo> = {};
                    snapshots.forEach(sn => {
                        sn.forEach(doc => out[doc.id] = doc.data());
                    });

                    resolve(doCount ? Object.keys(out).length : Object.values(out));
                })
                .catch(reject);
        });

    }

}

namespace FirestoreEventDatebase {
    /** An event as it is stored in the database. */
    type NonRegisterableEvent = {
        name:string,
        description:string,
        starts_at:Timestamp,
        ends_at:Timestamp,
        category:string,
        color?:ColorUtil.HexColor
    };

    type RegisterableEvent = NonRegisterableEvent & {
        capacity?:number,
        can_register_from?:Timestamp,
        can_register_until?:Timestamp,
        registrations:Record<string,string>,
        requires_payment:boolean
    };

    export type Event = NonRegisterableEvent | RegisterableEvent;

    export type Comment = {
        body:string,
        created_at:Timestamp
    };


}

export default FirestoreEventDatebase;