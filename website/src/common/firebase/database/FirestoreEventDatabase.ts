import { QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, documentId, getCountFromServer, getDocs, limit, query, where } from "@firebase/firestore";
import { ArticleFilterOptions, EventDatabase, EventFilterOptions, EventInfo } from "./database-def";
import { DB } from "../init-firebase";
import { clamp } from "../../util/NumberUtil";
import { HexColor } from "../../html-element-factory/AssemblyLine";
import { timespansOverlap } from "../../util/DateUtil";

/** An event as it is stored in the database. */
type DBEvent = {
    name:string,
    description:string,
    starts_at:Timestamp,
    ends_at:Timestamp,
    category:string,
    color?:HexColor
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/**
 * Arbitrary limit on the length (in ms) of an event.
 * @note any event longer than this may be incorrectly retrieved from the database
 */
const EVENT_LENGTH_LIMIT = 30 * MS_PER_DAY;

export default class FirestoreEventDatebase extends EventDatabase {

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

    getRange(from: Date, to: Date, options?: Omit<ArticleFilterOptions, "before" | "after"> | undefined): Promise<EventInfo[]> {
        return FirestoreEventDatebase.getEvents({range: {from, to}, ...options});
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
        if (options.range) { // apply range filter
            const lowerBound = new Date(options.range.from.getTime() - EVENT_LENGTH_LIMIT);
            constraints.push(where("starts_at", ">=", Timestamp.fromDate(lowerBound)), where("starts_at", "<=", Timestamp.fromDate(options.range.to)));
        }
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreEventDatebase.COLLECTION, ...constraints); // create query
            try {
                if (doCount) resolve((await getCountFromServer(q)).data().count); // get count
                else { // get documents
                    const snapshot = await getDocs(q);
                    let out: EventInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    if (options.range) out = out.filter(e => timespansOverlap(options.range!.from, options.range!.to, e.starts_at, e.ends_at));
                    resolve(out);
                }
            }
            catch (e) { reject(e); }
        });

    }

}