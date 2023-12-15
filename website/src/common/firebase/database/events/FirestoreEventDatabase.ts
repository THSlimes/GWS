import { FirestoreDataConverter, QueryCompositeFilterConstraint, QueryConstraint, QueryDocumentSnapshot, QueryFilterConstraint, QueryNonFilterConstraint, Timestamp, and, collection, collectionGroup, deleteDoc, doc, documentId, getCountFromServer, getDoc, getDocs, limit, or, orderBy, query, setDoc, where } from "@firebase/firestore";
import EventDatabase, { EventFilterOptions, EventInfo, EventRegistration } from "./EventDatabase";
import { AUTH, DB } from "../../init-firebase";
import { clamp } from "../../../util/NumberUtil";
import { HexColor } from "../../../html-element-factory/AssemblyLine";
import { FirebaseError } from "firebase/app";

/** An event as it is stored in the database. */
type DBEvent = {
    name:string,
    description:string,
    starts_at:Timestamp,
    ends_at:Timestamp,
    can_register_from?:Timestamp,
    can_register_until?:Timestamp,
    category:string,
    color?:HexColor
};

type DBEventRegistration = {
    registered_at:Timestamp,
    display_name:string
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Any event longer than (in ms) this may be queried incorrectly. */
const MAX_EVENT_DURATION = 7 * MS_PER_DAY;

function createConverter(db:EventDatabase):FirestoreDataConverter<EventInfo,DBEvent> {
    return {
        toFirestore(event: EventInfo): DBEvent {
            return {
                ...event,
                starts_at: Timestamp.fromDate(event.starts_at),
                ends_at: Timestamp.fromDate(event.ends_at),
                can_register_from: event.can_register_from ? Timestamp.fromDate(event.can_register_from) : undefined,
                can_register_until: event.can_register_until ? Timestamp.fromDate(event.can_register_until) : undefined,
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DBEvent, EventInfo>):EventInfo {
            const data = snapshot.data();
            
            return new EventInfo(
                db,
                snapshot.id,
                data.name,
                data.description,
                data.category,
                data.color,
                [data.starts_at.toDate(), data.ends_at.toDate()],
                [data.can_register_from?.toDate(), data.can_register_until?.toDate()],
            );
        }
    };
}

export default class FirestoreEventDatebase extends EventDatabase {

    private readonly collection = collection(DB, "events").withConverter(createConverter(this));
    private readonly registrationsConverter:FirestoreDataConverter<EventRegistration,DBEventRegistration> = {
        toFirestore(registration:EventRegistration) {
            return {
                registered_at: Timestamp.fromDate(registration.registered_at),
                display_name: registration.display_name
            }
        },
        fromFirestore(snapshot:QueryDocumentSnapshot<DBEventRegistration, EventRegistration>) {
            const data = snapshot.data();
            return new EventRegistration(snapshot.id, data.registered_at.toDate(), data.display_name);
        },
    }

    count(options?:EventFilterOptions): Promise<number> {
        return this.getEvents(options??{}, true);
    }

    getRange(from?: Date, to?: Date, options?: Omit<EventFilterOptions, "range">): Promise<EventInfo[]> {
        from ??= new Date(-8640000000000000);
        to ??= new Date(8640000000000000);
        return this.getEvents({range: {from, to}, ...options});
    }

    getById(id: string): Promise<EventInfo | undefined> {
        return new Promise((resolve, reject) => {
            this.getEvents({id})
            .then(e => {
                if (e.length === 0) resolve(undefined); // not found
                else resolve(e[0]); // found
            })
            .catch(reject);
        });
    }
    
    getByCategory(category: string, options?: Omit<EventFilterOptions, "category"> | undefined): Promise<EventInfo[]> {
        return this.getEvents({category, ...options});
    }

    getRegistrations(id: string, doCount:false):Promise<EventRegistration[]>;
    getRegistrations(id: string, doCount:true):Promise<number>;
    getRegistrations(id: string, doCount:boolean):Promise<EventRegistration[]> | Promise<number> {
        const regCollection = collection(DB, `events/${id}/registrations`).withConverter(this.registrationsConverter);
        if (doCount) return new Promise<number>((resolve,reject) => {
            getCountFromServer(regCollection)
            .then(res => resolve(res.data().count))
            .catch(reject);
        });
        else return new Promise<EventRegistration[]>((resolve,reject) => {
            getDocs(regCollection)
            .then(res => {
                const out:EventRegistration[] = [];
                res.forEach(doc => out.push(doc.data()));
                resolve(out);
            })
            .catch(reject);
        });
    }

    registerFor(id: string): Promise<EventRegistration> {
        return new Promise((resolve,reject) => {
            AUTH.authStateReady()
            .then(() => {
                if (AUTH.currentUser === null) reject(new FirebaseError("unauthenticated","Not logged in."));
                else {
                    const reg = new EventRegistration(AUTH.currentUser.uid, new Date(), AUTH.currentUser.displayName ?? "Geitje");
                    setDoc(doc(DB, `events/${id}/registrations/${AUTH.currentUser.uid}`), this.registrationsConverter.toFirestore(reg))
                    .then(() => resolve(reg))
                    .catch(reject);
                }
            })
            .catch(reject);
        });
    }

    isRegisteredFor(id: string): Promise<boolean> {
        return new Promise((resolve,reject) => {
            AUTH.authStateReady()
            .then(() => {
                if (AUTH.currentUser === null) resolve(false);
                else getDoc(doc(DB, `events/${id}/registrations/${AUTH.currentUser.uid}`))
                    .then(snapshot => resolve(snapshot.exists()))
                    .catch(reject);
            })
            .catch(reject);
        });
    }

    deregisterFor(id: string): Promise<void> {
        return new Promise((resolve,reject) => {
            AUTH.authStateReady()
            .then(() => {
                if (AUTH.currentUser === null) reject(new FirebaseError("unauthenticated","Not logged in."));
                else {
                    deleteDoc(doc(DB, `events/${id}/registrations/${AUTH.currentUser.uid}`))
                    .then(resolve)
                    .catch(reject);
                }
            })
            .catch(reject);
        });
    }

    private getEvents(options: EventFilterOptions, doCount?: false): Promise<EventInfo[]>;
    private getEvents(options: EventFilterOptions, doCount?: true): Promise<number>;
    private getEvents(options: EventFilterOptions, doCount = false): Promise<EventInfo[] | number> {
        const baseConstraints:QueryConstraint[] = [];

        // generic
        if (options.id !== undefined) baseConstraints.push(where(documentId(), "==", options.id));
        if (options.limit !== undefined) baseConstraints.push(limit(clamp(options.limit, 0, 100)));
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

            try {
                if (doCount && queries.length === 1) resolve((await getCountFromServer(queries[0])).data().count); // get simple count
                else { // get documents (or do manual count)
                    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
                    let out:Record<string, EventInfo> = {};
                    snapshots.forEach(sn => {
                        sn.forEach(doc => out[doc.id] = doc.data());
                    });

                    resolve(doCount ? Object.keys(out).length : Object.values(out));
                }
            }
            catch (e) { reject(e); }
        });

    }

}