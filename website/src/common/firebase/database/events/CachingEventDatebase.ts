import { earliest, latest } from "../../../util/DateUtil";
import EventDatabase, { EventFilterOptions, EventInfo } from "./EventDatabase";

/**
 * A CachingEventDatabase is a type of EventDatabase which
 * caches recent queries to allow for faster and more efficient
 * retrieval in the future.
 */
export default class CachingEventDatebase implements EventDatabase {

    private readonly relay:EventDatabase;

    constructor(db:EventDatabase) {
        this.relay = db;
    }

    private readonly countCache:Record<string,number> = {};
    count(options: EventFilterOptions = {}): Promise<number> {
        const optionsJSON = JSON.stringify(options);
        return new Promise(async (resolve, reject) => {
            if (optionsJSON in this.countCache) resolve(this.countCache[optionsJSON]);
            else this.relay.count(options)
                .then(n => resolve(this.countCache[optionsJSON] = n))
                .catch(reject);
        });
    }

    private readonly retrievedRange = { from:new Date(), to:new Date() };
    private readonly events:Record<string,EventInfo> = {};
    getRange(from?: Date, to?: Date, options?: Omit<EventFilterOptions, "range"> | undefined): Promise<EventInfo[]> {
        const fromCopy = from ? new Date(from) : new Date(-8640000000000000);
        const toCopy = to ? new Date(to) : new Date(8640000000000000);

        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from.getTime() <= fromCopy.getTime() && toCopy.getTime() <= this.retrievedRange.to.getTime()) {
                resolve(Object.values(this.events).filter(e => e.satisfies({range:{from:fromCopy, to:toCopy}, ...options })));
            }
            else { // have to retrieve some events
                this.relay.getRange(from, to)
                .then(newEvents => {
                    newEvents.forEach(e => this.events[e.id] = e); // save for later
                    // update range
                    this.retrievedRange.from = earliest(this.retrievedRange.from, fromCopy);
                    this.retrievedRange.to = latest(this.retrievedRange.to, toCopy);
                    resolve(newEvents);
                })
                .catch(reject);
            }
        });
    }

    private readonly idCache:Record<string, EventInfo|undefined> = {}
    getById(id: string): Promise<EventInfo | undefined> {
        return new Promise((resolve, reject) => {
            if (id in this.idCache) resolve(this.idCache[id]);
            else this.relay.getById(id)
                .then(event => resolve(this.idCache[id] = event))
                .catch(reject);
        });
    }

    private readonly categoryCache:Record<string, EventInfo[]> = {}
    getByCategory(category: string, options?: Omit<EventFilterOptions, "category"> | undefined): Promise<EventInfo[]> {
        return new Promise((resolve, reject) => {
            if (category in this.categoryCache) {
                resolve(this.categoryCache[category].filter(e => e.satisfies({category, ...options})));
            }
            else this.relay.getByCategory(category)
                .then(events => {
                    this.categoryCache[category] = events;
                    resolve(events.filter(e => e.satisfies({category, ...options})));
                })
                .catch(reject)
        });
    }

}