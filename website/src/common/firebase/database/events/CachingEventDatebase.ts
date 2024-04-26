import DateUtil from "../../../util/DateUtil";
import EventDatabase, { EventQueryFilter, EventInfo } from "./EventDatabase";

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
    public get earliest():EventInfo|null {
        let earliest:EventInfo|null = null;
        for (const id in this.idCache) {
            const event = this.idCache[id]!;
            if (earliest === null || event.starts_at < earliest.starts_at) earliest = event;
        }

        return earliest;
    }
    public get latest():EventInfo|null {
        let latest:EventInfo|null = null;
        for (const id in this.idCache) {
            const event = this.idCache[id]!;
            if (latest === null || event.ends_at > latest.ends_at) latest = event;
        }

        return latest;
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

    doRegisterFor(event:EventInfo, comment?:string):Promise<[string,string]> {
        return this.relay.registerFor(event, comment);
    }

    doDeregisterFor(event:EventInfo):Promise<string> {
        return this.relay.deregisterFor(event);
    }

    /** Mapping of event IDs to their comment collection. */
    private readonly commentCache:Record<string,Record<string,EventInfo.Components.Registerable.Comment>> = {};
    fetchCommentsFor(event:EventInfo):Promise<Record<string, EventInfo.Components.Registerable.Comment>> {
        if (!event.hasComponent(EventInfo.Components.Registerable)) throw new Error("Event is not registerable, thus does not have any comments");

        return new Promise((resolve,reject) => {
            if (event.id in this.commentCache) resolve(this.commentCache[event.id]);
            else this.relay.getCommentsFor(event)
                .then(comments => resolve(this.commentCache[event.id] = comments))
                .catch(reject);
        });
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

        // remove from commentCache
        for (const rec of records) delete this.commentCache[rec.id];
    }

    doDelete(...records:EventInfo[]):Promise<number> {
        return this.relay.delete(...records);
    }

}