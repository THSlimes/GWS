import { count } from "../../../util/ArrayUtil";
import { earliest, latest } from "../../../util/DateUtil";
import { QueryFilter } from "../Database";
import EventDatabase, { EventQueryFilter, EventInfo, EventRegistration } from "./EventDatabase";

/**
 * A CachingEventDatabase is a type of EventDatabase which
 * caches recent queries to allow for faster and more efficient
 * retrieval in the future.
 */
export default class CachingEventDatebase extends EventDatabase {

    private readonly relay:EventDatabase;

    constructor(db:EventDatabase) {
        super();

        this.relay = db;
    }

    private readonly getCache:Record<string,EventInfo[]> = {};
    public get(options?:EventQueryFilter, invalidateCache=false): Promise<EventInfo[]> {
        const optionsJSON = JSON.stringify(options);
        if (invalidateCache) delete this.countCache[optionsJSON];

        return new Promise(async (resolve, reject) => {
            if (optionsJSON in this.countCache) resolve(this.getCache[optionsJSON]);
            else this.relay.get(options)
                .then(res => resolve(this.getCache[optionsJSON] = res))
                .catch(reject);
        });
    }

    private readonly countCache:Record<string,number> = {};
    count(options:EventQueryFilter = {}, invalidateCache=false): Promise<number> {
        const optionsJSON = JSON.stringify(options);
        if (invalidateCache) delete this.countCache[optionsJSON];

        return new Promise(async (resolve, reject) => {
            if (optionsJSON in this.countCache) resolve(this.countCache[optionsJSON]);
            else this.relay.count(options)
                .then(n => resolve(this.countCache[optionsJSON] = n))
                .catch(reject);
        });
    }

    private readonly retrievedRange = { from:new Date(), to:new Date() };
    private readonly rangeCache:Record<string,EventInfo> = {};
    getRange(from?:Date, to?:Date, options?:Omit<EventQueryFilter, "range"> | undefined): Promise<EventInfo[]> {
        const fromCopy = from ? new Date(from) : new Date(-8640000000000000);
        const toCopy = to ? new Date(to) : new Date(8640000000000000);

        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from <= fromCopy && toCopy <= this.retrievedRange.to) {
                resolve(Object.values(this.rangeCache).filter(e => e.satisfies({range:{from:fromCopy, to:toCopy}, ...options })));
            }
            else { // have to retrieve some events
                this.relay.getRange(from, to)
                .then(newEvents => {
                    newEvents.forEach(e => this.rangeCache[e.id] = e); // save for later
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
    getById(id: string, invalidateCache=false): Promise<EventInfo | undefined> {
        if (invalidateCache) delete this.idCache[id];

        return new Promise((resolve, reject) => {
            if (id in this.idCache) resolve(this.idCache[id]);
            else this.relay.getById(id)
                .then(event => resolve(this.idCache[id] = event))
                .catch(reject);
        });
    }

    private readonly categoryCache:Record<string, EventInfo[]> = {}
    getByCategory(category: string, options?: Omit<EventQueryFilter, "category"> | undefined, invalidateCache=false): Promise<EventInfo[]> {
        if (invalidateCache) delete this.categoryCache[category];

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

    registerFor(eventId: string): Promise<Record<string, string>> {
        return this.relay.registerFor(eventId);
    }

    deregisterFor(eventId: string): Promise<Record<string, string>> {
        return this.deregisterFor(eventId);
    }

    public write(...events: EventInfo[]): Promise<number> {
        const out = this.relay.write(...events);

        out.then(() => { // add to caches on success
            for (const optionsJSON in this.getCache) { // add to getCache
                const options = JSON.parse(optionsJSON) as EventQueryFilter;
                this.getCache[optionsJSON].push(...events.filter(e => e.satisfies(options)));
            }

            for (const optionsJSON in this.countCache) { // add to countCache
                const options = JSON.parse(optionsJSON) as EventQueryFilter;
                this.countCache[optionsJSON] += count(events, e => e.satisfies(options));
            }

            for (const e of events) { // update rangeCache
                if (e.satisfies({range: this.retrievedRange})) this.rangeCache[e.id] = e;
            }

            for (const e of events) { // update idCache
                this.idCache[e.id] = e;
            }

            for (const cat in this.categoryCache) { // update categoryCache
                this.categoryCache[cat].push(...events.filter(e => e.category === cat));
            }
        });

        return out;
    }

}