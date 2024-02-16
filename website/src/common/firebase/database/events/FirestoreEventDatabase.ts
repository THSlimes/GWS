import { FirestoreDataConverter, QueryCompositeFilterConstraint, QueryConstraint, QueryDocumentSnapshot, QueryFilterConstraint, QueryNonFilterConstraint, Timestamp, and, collection, collectionGroup, deleteDoc, doc, documentId, getCountFromServer, getDoc, getDocs, limit, or, orderBy, query, setDoc, updateDoc, where, writeBatch } from "@firebase/firestore";
import EventDatabase, { EventQueryFilter, RegisterableEventInfo, EventInfo } from "./EventDatabase";
import { AUTH, DB, onAuth } from "../../init-firebase";
import { HexColor } from "../../../util/StyleUtil";
import { FirebaseError } from "firebase/app";

/** An event as it is stored in the database. */
type NonRegisterableDBEvent = {
    name:string,
    description:string,
    starts_at:Timestamp,
    ends_at:Timestamp,
    category:string,
    color?:HexColor
};

type RegisterableDBEvent = NonRegisterableDBEvent & {
    capacity?:number,
    can_register_from?:Timestamp,
    can_register_until?:Timestamp,
    registrations:Record<string,string>
};

type DBEvent = NonRegisterableDBEvent | RegisterableDBEvent;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Any event longer than (in ms) this may be queried incorrectly. */
const MAX_EVENT_DURATION = 7 * MS_PER_DAY;

function toFirestore(event:EventInfo):DBEvent {
    return event instanceof RegisterableEventInfo ? {
        name: event.name,
        description: event.description,
        category: event.category,
        ...(event.color && { color: event.color }),
        registrations: event.registrations,
        capacity: event.capacity,
        starts_at: Timestamp.fromDate(event.starts_at),
        ends_at: Timestamp.fromDate(event.ends_at),
        can_register_from: event.can_register_from ? Timestamp.fromDate(event.can_register_from) : undefined,
        can_register_until: event.can_register_until ? Timestamp.fromDate(event.can_register_until) : undefined,
    } : {
        name: event.name,
        description: event.description,
        category: event.category,
        ...(event.color && { color: event.color }),
        starts_at: Timestamp.fromDate(event.starts_at),
        ends_at: Timestamp.fromDate(event.ends_at)
    };
}

function createConverter(db:EventDatabase):FirestoreDataConverter<EventInfo|RegisterableEventInfo,DBEvent> {
    return {
        toFirestore,
        fromFirestore(snapshot: QueryDocumentSnapshot<DBEvent, EventInfo>):EventInfo {
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
export default class FirestoreEventDatebase extends EventDatabase {

    private readonly converter = createConverter(this);
    private readonly collection = collection(DB, "events").withConverter(this.converter);

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
        return new Promise((resolve, reject) => {
            this.getEvents({id})
            .then(e => {
                if (e.length === 0) resolve(undefined); // not found
                else resolve(e[0]); // found
            })
            .catch(reject);
        });
    }
    
    getByCategory(category: string, options?: Omit<EventQueryFilter, "category"> | undefined): Promise<EventInfo[]> {
        return this.getEvents({category, ...options});
    }

    registerFor(eventId: string): Promise<Record<string,string>> {
        return new Promise((resolve,reject) => {
            onAuth()
            .then(user => {
                if (user === null) reject(new FirebaseError("unauthenticated", "Je bent niet ingelogd."));
                else this.getById(eventId)
                    .then(event => {
                        if (!event) reject(new FirebaseError("not-found", `No event with id ${eventId}`));
                        else if (!(event instanceof RegisterableEventInfo)) {
                            reject(new FirebaseError("precondition-failed", "Het is niet mogelijk om je voor deze activiteit in te schrijven."));
                        }
                        else {
                            const newRegistrations = { ...event.registrations };
                            newRegistrations[user.uid] = "Geitje";
                            updateDoc(doc(DB, `events/${eventId}`).withConverter(this.converter), { registrations: newRegistrations })
                            .then(() => resolve(newRegistrations))
                            .catch(reject);
                        }
                    })
                    .catch(reject);
            });
        });
    }

    deregisterFor(eventId: string): Promise<Record<string,string>> {
        return new Promise((resolve,reject) => {
            onAuth()
            .then(user => {
                if (user === null) reject(new FirebaseError("unauthenticated", "Not logged in."));
                else this.getById(eventId)
                    .then(event => {
                        if (!event) reject(new FirebaseError("not-found", `No event with id ${eventId}`));
                        else if (!(event instanceof RegisterableEventInfo)) {
                            reject(new FirebaseError("precondition-failed", "Het is niet mogelijk om je voor deze activiteit in te schrijven."));
                        }
                        else {
                            const newRegistrations = { ...event.registrations };
                            delete newRegistrations[user.uid];
                            updateDoc(doc(DB, `events/${eventId}`).withConverter(this.converter), { registrations: newRegistrations })
                            .then(() => resolve(newRegistrations))
                            .catch(reject);
                        }
                    })
                    .catch(reject);
            });
        });
    }

    public doWrite(...records: EventInfo[]): Promise<number> {
        return new Promise((resolve,reject) => {
            const batch = writeBatch(DB);
            for (const rec of records) batch.set(doc(DB, "events", rec.id), toFirestore(rec));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
    }

    public doDelete(...records: EventInfo[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const batch = writeBatch(DB);
            for (const rec of records) batch.delete(doc(DB, "events", rec.id));

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