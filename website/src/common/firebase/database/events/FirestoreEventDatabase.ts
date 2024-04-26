import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, deleteField, doc, documentId, getCountFromServer, getDoc, getDocs, limit, query, where, writeBatch } from "@firebase/firestore";
import EventDatabase, { EventQueryFilter, EventInfo } from "./EventDatabase";
import { FIRESTORE, onAuth } from "../../init-firebase";
import { FirebaseError } from "firebase/app";
import FirestoreUserDatabase from "../users/FirestoreUserDatabase";
import ColorUtil from "../../../util/ColorUtil";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Any event longer than (in ms) this may be queried incorrectly. */
const MAX_EVENT_DURATION = 7 * MS_PER_DAY;

function createConverter(db:EventDatabase):FirestoreDataConverter<EventInfo,FirestoreEventDatebase.Event> {
    return {
        toFirestore(event:EventInfo):FirestoreEventDatebase.Event {
            const regComp = event.getComponent(EventInfo.Components.Registerable);
            return regComp ? {
                name: event.name,
                description: event.description,
                category: event.category,
                ...(event.hasComponent(EventInfo.Components.Color) && { color: event.getComponent(EventInfo.Components.Color)!.bg }),
                registrations: regComp.registrations,
                ...(regComp.capacity && { capacity: regComp.capacity }),
                ...(event.hasComponent(EventInfo.Components.Cost) && { cost: event.getComponent(EventInfo.Components.Cost)!.cost }),
                starts_at: Timestamp.fromDate(event.starts_at),
                ends_at: Timestamp.fromDate(event.ends_at),
                ...(event.hasComponent(EventInfo.Components.RegistrationStart) && {
                    can_register_from: Timestamp.fromDate(event.getComponent(EventInfo.Components.RegistrationStart)!.moment)
                }),
                ...(event.hasComponent(EventInfo.Components.RegistrationEnd) && {
                    can_register_until: Timestamp.fromDate(event.getComponent(EventInfo.Components.RegistrationEnd)!.moment)
                })
            } : {
                name: event.name,
                description: event.description,
                category: event.category,
                ...(event.hasComponent(EventInfo.Components.Color) && { color: event.getComponent(EventInfo.Components.Color)!.bg }),
                starts_at: Timestamp.fromDate(event.starts_at),
                ends_at: Timestamp.fromDate(event.ends_at),
            }
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreEventDatebase.Event,EventInfo>):EventInfo {
            const data = snapshot.data();

            // TODO: change DB data structure
            const components:EventInfo.Component[] = [];
            if (data.color) components.push(new EventInfo.Components.Color(data.color));
            if ("registrations" in data) {
                components.push(new EventInfo.Components.Registerable(data.registrations, data.capacity));
                if (data.can_register_from) components.push(new EventInfo.Components.RegistrationStart(data.can_register_from.toDate()));
                if (data.can_register_until) components.push(new EventInfo.Components.RegistrationEnd(data.can_register_until.toDate()));
                if (data.cost) components.push(new EventInfo.Components.Cost(data.cost));
            }

            return new EventInfo(
                db,
                snapshot.id,
                data.name,
                data.description,
                data.category,
                [data.starts_at.toDate(), data.ends_at.toDate()],
                components
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
    protected override doRegisterFor(ev: EventInfo, comment?: string): Promise<[string, string]> {
        return onAuth() // get logged in user
            .then(user => {
                if (user === null) throw new FirebaseError("unauthenticated", "Not logged in.");
                else return FirestoreEventDatebase.USER_DB.getById(user.uid); // get user info
            })
            .then(userInfo => {
                if (!userInfo) throw new Error("user not found!!"); // failsafe, should not happen!
                else {
                    const batch = writeBatch(FIRESTORE);
                    batch.update(doc(this.collection, ev.id), { [`registrations.${userInfo.id}`]: userInfo.fullName });

                    if (comment) { // add comment to db
                        const dbComment:FirestoreEventDatebase.Comment = { body: comment, created_at: Timestamp.now() };
                        batch.set(doc(FIRESTORE, "events", ev.id, "comments", userInfo.id), dbComment);
                    }

                    return Promise.all([batch.commit(), [userInfo.id, userInfo.fullName] as [string,string]]);
                }
            })
            .then(([_, regEntry]) => regEntry);
    }

    protected override doDeregisterFor(ev: EventInfo): Promise<string> {
        return onAuth()
            .then(user => {
                if (user === null) throw new FirebaseError("unauthenticated", "Not logged in.");
                else {
                    const batch = writeBatch(FIRESTORE);
                    batch.update(doc(this.collection, ev.id), { [`registrations.${user.uid}`]: deleteField() }); // remove from registrations field
                    batch.delete(doc(this.collection, ev.id, "comments", user.uid)); // delete comment

                    return Promise.all([batch.commit(), user.uid]);
                }
            })
            .then(([_, id]) => id);
    }

    protected override fetchCommentsFor(event: EventInfo): Promise<Record<string, EventInfo.Components.Registerable.Comment>> {
        const commentCollection = collection(FIRESTORE, "events", event.id, "comments");
        return getDocs(commentCollection)
            .then(snapshot => {
                const out:Record<string,EventInfo.Components.Registerable.Comment> = {};
                snapshot.forEach(docSnapshot => {
                    const data = docSnapshot.data() as FirestoreEventDatebase.Comment;
                    out[docSnapshot.id] = { id:docSnapshot.id, created_at: data.created_at.toDate(), body: data.body };
                });

                return out;
            });
    }

    public doWrite(...records: EventInfo[]): Promise<number> {
        return new Promise((resolve,reject) => {
            const batch = writeBatch(FIRESTORE);
            for (const rec of records) batch.set(doc(FIRESTORE, "events", rec.id), this.converter.toFirestore(rec));

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
        cost:number
    };

    export type Event = NonRegisterableEvent | RegisterableEvent;

    export type Comment = {
        body:string,
        created_at:Timestamp
    };


}

export default FirestoreEventDatebase;