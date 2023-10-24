import { QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, documentId, getCountFromServer, getDocs, limit, orderBy, query, where } from "@firebase/firestore";
import { ArticleFilterOptions, ArticleInfo, EventDatabase, EventFilterOptions, EventInfo } from "../../database-def";
import { DB } from "../init-firebase";
import { clamp } from "../../NumberUtil";

/** An event as it is stored in the database. */
type DBEvent = {
    name:string,
    description:string,
    starts_at:Timestamp,
    ends_at:Timestamp,
    category:string
};

export class FirestoreEventDatebase extends EventDatabase {

    private static readonly COLLECTION = collection(DB, "events").withConverter({
        toFirestore(event: EventInfo): DBEvent {
            return {
                ...event,
                starts_at:Timestamp.fromDate(event.starts_at),
                ends_at:Timestamp.fromDate(event.ends_at),
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DBEvent, EventInfo>):EventInfo {
            const data = snapshot.data();
            return {
                ...data,
                id: snapshot.id,
                starts_at: data.starts_at.toDate(),
                ends_at: data.ends_at.toDate()
            };
        }
    });

    get(limit: number, options?: Omit<EventFilterOptions, "limit"> | undefined): Promise<EventInfo[]> {
        return FirestoreEventDatebase.getEvents({limit, ...options});
    }

    count(options?: EventFilterOptions | undefined): Promise<number> {
        return FirestoreEventDatebase.getEvents(options ?? {}, true);
    }

    getRange(before: Date, after: Date, options?: Omit<ArticleFilterOptions, "before" | "after"> | undefined): Promise<EventInfo[]> {
        return FirestoreEventDatebase.getEvents({before, after, ...options});
    }

    getById(id: string): Promise<EventInfo | undefined> {
        return new Promise((resolve, reject) => {
            FirestoreEventDatebase.getEvents({id})
            .then(e => {
                if (e.length === 0) resolve(undefined); // not found
                else resolve(e[0]); // found
            })
            .catch(reject);
        });
    }
    
    getByCategory(category: string, options?: Omit<EventFilterOptions, "category"> | undefined): Promise<EventInfo[]> {
        return FirestoreEventDatebase.getEvents({category, ...options});
    }

    private static getEvents(options: EventFilterOptions, doCount?: false): Promise<EventInfo[]>;
    private static getEvents(options: EventFilterOptions, doCount?: true): Promise<number>;
    private static getEvents(options: EventFilterOptions, doCount = false): Promise<EventInfo[] | number> {
        const constraints: QueryConstraint[] = []; // convert options into constraints

        // general
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        // event-specific
        if (options.before) constraints.push(where("starts_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("starts_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreEventDatebase.COLLECTION, ...constraints); // create query
            try {
                if (doCount) resolve((await getCountFromServer(q)).data().count); // get count
                else { // get documents
                    const snapshot = await getDocs(q);
                    const out: EventInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    resolve(out);
                }
            }
            catch (e) { reject(e); }
        });

    }

}