import { earliest, latest, timespansOverlap } from "../../util/DateUtil";
import { EventDatabase, EventFilterOptions, EventInfo } from "./database-def";

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

    private readonly getCache:Record<string,EventInfo[]> = {};
    get(limit: number, options: Omit<EventFilterOptions, "limit">={}): Promise<EventInfo[]> {
        const optionsJSON = JSON.stringify(options);
        return new Promise(async (resolve, reject) => {
            if (optionsJSON in this.getCache && this.getCache[optionsJSON].length >= limit) {
                resolve(this.getCache[optionsJSON].slice(0,limit));
            }
            else this.relay.get(limit, options)
                .then(events => {
                    this.getCache[optionsJSON] = [...events];
                    resolve(events);
                })
                .catch(reject);
        });
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
    getRange(from: Date, to: Date, options?: Omit<EventFilterOptions, "range"> | undefined): Promise<EventInfo[]> {
        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from.getTime() <= from.getTime() && to.getTime() <= this.retrievedRange.to.getTime()) {
                resolve(Object.values(this.events).filter(e => CachingEventDatebase.satisfiesOptions(e, { range:{from,to}, ...options })));
            }
            else { // have to retrieve some events
                this.relay.getRange(from, to)
                .then(newEvents => {
                    newEvents.forEach(e => this.events[e.id] = e); // save for later
                    // update range
                    this.retrievedRange.from = earliest(this.retrievedRange.from, from);
                    this.retrievedRange.to = latest(this.retrievedRange.to, to);
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
                resolve(this.categoryCache[category].filter(e => CachingEventDatebase.satisfiesOptions(e, {category, ...options})));
            }
            else this.relay.getByCategory(category)
                .then(events => {
                    this.categoryCache[category] = events;
                    resolve(events.filter(e => CachingEventDatebase.satisfiesOptions(e, {category, ...options})));
                })
                .catch(reject)
        });
    }

    private static satisfiesOptions(event:EventInfo, options:EventFilterOptions):boolean {
        if (options.id && event.id !== options.id) return false;
        else if (options.notId && event.id === options.notId) return false;
        else if (options.limit === 0) return false;
        else if (options.range && !timespansOverlap(options.range.from, options.range.to, event.starts_at, event.ends_at)) return false;
        else if (options.category && event.category !== options.category) return false;
        else return true;
    }

}