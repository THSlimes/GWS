import ArrayUtil from "../../../util/ArrayUtil";
import DateUtil from "../../../util/DateUtil";
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
        this.relay.onWrite = (...newRecords) => this.addToCaches(...newRecords);
        this.relay.onDelete = (...newRecords) => this.removeFromCaches(...newRecords);
    }

    private readonly getCache:Record<string,EventInfo[]> = {};
    public get(options?:EventQueryFilter, invalidateCache=false): Promise<EventInfo[]> {

        const optionsJSON = JSON.stringify(options);
        if (invalidateCache) delete this.getCache[optionsJSON];

        return new Promise(async (resolve, reject) => {
            if (optionsJSON in this.getCache) resolve(this.getCache[optionsJSON]);
            else this.relay.get(options)
                .then(res => {
                    this.addToCaches(...res);
                    resolve(res);
                })
                .catch(reject);
        });
    }

    count(options?:EventQueryFilter): Promise<number> {
        return this.relay.count(options)
    }

    private readonly retrievedRange = { from:new Date(), to:new Date() };
    private readonly rangeCache:Record<string,EventInfo> = {};
    getRange(from?:Date, to?:Date, options?:Omit<EventQueryFilter, "range"> | undefined): Promise<EventInfo[]> {
        
        const fromCopy = from ? DateUtil.Timestamps.copy(from) : DateUtil.FIRST;
        const toCopy = to ? DateUtil.Timestamps.copy(to) : DateUtil.LAST;

        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from <= fromCopy && toCopy <= this.retrievedRange.to) { // already has entire range
                resolve(Object.values(this.rangeCache).filter(e => e.satisfies({range:{from:fromCopy, to:toCopy}, ...options })));
            }
            else this.relay.getRange(from, to) // have to retrieve some events
                .then(newEvents => {
                    // update range
                    this.retrievedRange.from = DateUtil.Timestamps.earliest(this.retrievedRange.from, fromCopy);
                    this.retrievedRange.to = DateUtil.Timestamps.latest(this.retrievedRange.to, toCopy);

                    // update caches
                    this.addToCaches(...newEvents);

                    resolve(newEvents);
                })
                .catch(reject);
        });
    }

    private readonly idCache:Record<string, EventInfo|undefined> = {}
    getById(id: string, invalidateCache=false): Promise<EventInfo | undefined> {
        if (invalidateCache) delete this.idCache[id];

        return new Promise((resolve, reject) => {
            if (id in this.idCache) resolve(this.idCache[id]);
            else this.relay.getById(id)
                .then(event => {
                    if (event) this.addToCaches(event);
                    resolve(event);
                })
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
                    this.addToCaches(...events);
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

    public override set onWrite(newHandler:(...newRecords:EventInfo[])=>void) {
        this.relay.onWrite = newHandler;
    }

    private addToCaches(...events: EventInfo[]):void {
        this.removeFromCaches(...events); // remove in case some event are already caches

        for (const optionsJSON in this.getCache) { // add to getCache
            const options = JSON.parse(optionsJSON) as EventQueryFilter;
            this.getCache[optionsJSON].push(...events.filter(e => e.satisfies(options)));
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
    }

    doWrite(...records:EventInfo[]): Promise<number> {
        return this.relay.write(...records);
    }

    public override set onDelete(newHandler:(...newRecords:EventInfo[])=>void) {
        this.relay.onDelete = newHandler;
    }

    private removeFromCaches(...records:EventInfo[]):void {
        const ids = records.map(e => e.id);

        // remove from getCache
        for (const opt in this.getCache) this.getCache[opt] = this.getCache[opt].filter(e => !ids.includes(e.id));

        for (const rec of records) {
            delete this.rangeCache[rec.id]; // remove from rangeCache
            delete this.idCache[rec.id]; // remove from idCache
        }

        // remove from categoryCache
        for (const cat in this.categoryCache) this.categoryCache[cat] = this.categoryCache[cat].filter(e => !ids.includes(e.id));
    }

    doDelete(...records:EventInfo[]):Promise<number> {
        return this.relay.delete(...records);
    }

}