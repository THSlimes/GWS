import { QueryCompositeFilterConstraint, QueryConstraint, QueryDocumentSnapshot, QueryFilterConstraint, QueryNonFilterConstraint, Timestamp, and, collection, documentId, getCountFromServer, getDocs, limit, or, orderBy, query, where } from "@firebase/firestore";
import EventDatabase, { EventFilterOptions, EventInfo } from "./EventDatabase";
import { DB } from "../../init-firebase";
import { clamp } from "../../../util/NumberUtil";
import { HexColor } from "../../../html-element-factory/AssemblyLine";

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Any event longer than (in ms) this may be queried incorrectly. */
const MAX_EVENT_DURATION = 7 * MS_PER_DAY;

export default class FirestoreEventDatebase extends EventDatabase {

    private static readonly COLLECTION = collection(DB, "events").withConverter({
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
                snapshot.id,
                data.name,
                data.description,
                [data.starts_at.toDate(), data.ends_at.toDate()],
                [data.can_register_from?.toDate(), data.can_register_until?.toDate()],
                data.category,
                data.color
            );
        }
    });

    count(options?:EventFilterOptions): Promise<number> {
        return FirestoreEventDatebase.getEvents(options??{}, true);
    }

    getRange(from?: Date, to?: Date, options?: Omit<EventFilterOptions, "range">): Promise<EventInfo[]> {
        from ??= new Date(-8640000000000000);
        to ??= new Date(8640000000000000);
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
            const queries = rangeConstraints.map(rc => query(FirestoreEventDatebase.COLLECTION, ...rc, ...baseConstraints));

            try {
                if (doCount && queries.length === 1) resolve((await getCountFromServer(queries[0])).data().count); // get simple count
                else { // get documents (or do manual count)
                    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
                    let out:Record<string, EventInfo> = {};
                    snapshots.forEach(sn => {
                        sn.forEach(doc => {
                            const data = doc.data();
                            out[data.id] = data;
                        });
                    });

                    resolve(doCount ? Object.keys(out).length : Object.values(out));
                }
            }
            catch (e) { reject(e); }
        });

    }

}