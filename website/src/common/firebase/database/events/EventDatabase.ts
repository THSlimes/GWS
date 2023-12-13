import { HexColor } from "../../../html-element-factory/AssemblyLine";
import { Opt } from "../../../util/UtilTypes";
import QueryOptions from "../QueryOptions";

type TimeSpan = [Date, Date];
type OpenTimespan = [Date|undefined, Date|undefined];

export class EventRegistration {

    public readonly registered_at:Date;
    public readonly display_name:string;

    constructor(registered_at:Date, display_name:string) {
        this.registered_at = registered_at;
        this.display_name = display_name;
    }

}

export class EventInfo {
    private sourceDB:EventDatabase;

    public readonly id:string;
    public readonly name:string;
    public readonly description:string;
    public readonly category:string;
    public readonly color?:HexColor;

    public readonly starts_at:Date;
    public readonly ends_at:Date;
    
    public readonly can_register_from?:Date;
    public readonly can_register_until?:Date;
    public readonly capacity?:number;

    private registrations?:EventRegistration[];
    public getRegistrations(useCache=true):Promise<EventRegistration[]> {
        if (!useCache) this.registrations = undefined; // clear cached value

        return new Promise((resolve,reject) => {
            if (this.registrations === undefined) {
                // retrieve from DB
                this.sourceDB.getRegistrations(this.id, false)
                .then(res => {
                    this.registrations = res;
                    resolve(this.registrations);
                })
                .catch(reject);
            }
            else resolve(this.registrations);
        });
    }

    constructor(
        sourceDB:EventDatabase,
        id:string,
        name:string,
        description:string,
        category="",
        color:Opt<HexColor>=undefined,
        timespan:TimeSpan,
        registrationPeriod:OpenTimespan,
        capacity:Opt<number>=undefined
    ) {
        this.sourceDB = sourceDB;
        
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.color = color;

        [this.starts_at, this.ends_at] = timespan;

        [this.can_register_from, this.can_register_until] = registrationPeriod;
        this.capacity = capacity;
    }

    /** Whether this event is currently ongoing. */
    public isNow(d=new Date()):boolean {
        return this.starts_at <= d && d <= this.ends_at;
    }

    /** Whether at least one person can register for this event. */
    public hasSpaceLeft(useCache=false):Promise<boolean> {
        return new Promise((resolve,reject) => {
            const capacity = this.capacity;
            if (capacity === undefined || capacity === Infinity) resolve(true);
            else this.getRegistrations(useCache)
                .then(res => resolve(res.length < capacity))
                .catch(reject);
        });
    }

    /** Whether this events registration period is ongoing. */
    public openForRegistration(d=new Date()):boolean {
        if (this.starts_at <= d) return false; // can only register before event
        else if (this.can_register_from && this.can_register_until) return this.can_register_from <= d && d <= this.can_register_until;
        else if (this.can_register_from) return this.can_register_from <= d;
        else if (this.can_register_until) return d <= this.can_register_until;
        else return true;
    }

    /** Whether this event matches the given filter. */
    public satisfies(options:EventFilterOptions):boolean {
        if (options.id && this.id !== options.id) return false;
        if (options.notId && this.id === options.notId) return false;
        if (options.limit === 0) return false;
        if (options.range) {
            if (options.range.from && this.starts_at < options.range.from && this.ends_at < options.range.from) return false;
            if (options.range.to && this.starts_at > options.range.to && this.ends_at > options.range.to) return false;
        }
        if (options.category && this.category !== options.category) return false;
        
        return true;
    }
}

export type EventFilterOptions = QueryOptions & {
    range?: { from: Date; to: Date; } | { from?: Date; to: Date; } | { from: Date; to?: Date; };
    category?: string;
};

export default abstract class EventDatabase {
    abstract count(options?: Omit<EventFilterOptions, "range">): Promise<number>;

    abstract getRange(from?: Date, to?: Date, options?: Omit<EventFilterOptions, "range">): Promise<EventInfo[]>;

    abstract getById(id: string): Promise<EventInfo | undefined>;

    abstract getByCategory(category: string, options?: Omit<EventFilterOptions, "category">): Promise<EventInfo[]>;

    abstract getRegistrations(id:string, doCount:false):Promise<EventRegistration[]>;
    abstract getRegistrations(id:string, doCount:true):Promise<number>;
    abstract getRegistrations(id:string, doCount:boolean):Promise<EventRegistration[]> | Promise<number>;
}
