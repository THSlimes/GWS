import { HexColor } from "../../../html-element-factory/AssemblyLine";
import { Opt } from "../../../util/UtilTypes";
import { AUTH } from "../../init-firebase";
import QueryOptions from "../QueryOptions";

type TimeSpan = [Date, Date];
type OpenTimespan = [Date|undefined, Date|undefined];

export class EventRegistration {

    public readonly uid:string;
    public readonly registered_at:Date;
    public readonly display_name:string;

    constructor(uid:string, registered_at:Date, display_name:string) {
        this.uid = uid;
        this.registered_at = registered_at;
        this.display_name = display_name;
    }

}

/** An EventInfo object contains all relevant information of an event.  */
export class EventInfo {
    protected sourceDB:EventDatabase;

    public readonly id:string;
    public readonly name:string;
    public readonly description:string;
    public readonly category:string;
    public readonly color?:HexColor;

    public readonly starts_at:Date;
    public readonly ends_at:Date;

    constructor(
        sourceDB:EventDatabase,
        id:string,
        name:string,
        description:string,
        category="",
        color:Opt<HexColor>=undefined,
        timespan:TimeSpan
    ) {
        this.sourceDB = sourceDB;
        
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.color = color;

        [this.starts_at, this.ends_at] = timespan;
    }

    /** Whether this event is currently ongoing. */
    public isNow(d=new Date()):boolean {
        return this.starts_at <= d && d <= this.ends_at;
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

/** RegisterableEventInfo is a type of EventInfo for which a user is able to register. */
export class RegisterableEventInfo extends EventInfo {

    public readonly registrations:Record<string,string>;
    public readonly capacity?:number;
    public readonly can_register_from?:Date;
    public readonly can_register_until?:Date;

    constructor(
        sourceDB:EventDatabase,
        id:string,
        name:string,
        description:string,
        category="",
        color:Opt<HexColor>=undefined,
        timespan:TimeSpan,

        registrations:Record<string,string>,
        capacity?:number,
        registration_period?:OpenTimespan
    ) {
        super(sourceDB,id,name,description,category,color,timespan);

        this.registrations = registrations;
        this.capacity = capacity;
        [this.can_register_from,this.can_register_until] = registration_period ?? [];
    }

    /** Whether at least one person can register for this event. */
    public isFull(useCache=false):boolean {
        return this.capacity !== undefined && Object.keys(this.registrations).length >= this.capacity;
    }

    /** Whether this events registration period is ongoing. */
    public openForRegistration(d=new Date()):boolean {
        if (this.starts_at <= d) return false; // can only register before event
        else if (this.can_register_from && this.can_register_until) return this.can_register_from <= d && d <= this.can_register_until;
        else if (this.can_register_from) return this.can_register_from <= d;
        else if (this.can_register_until) return d <= this.can_register_until;
        else return true;
    }

    /** Checks whether the current user is registered for this event. */
    public isRegistered(userId:string):boolean {
        return userId in this.registrations;
    }

    /** Registers the current user for this event. */
    public register():Promise<void> {
        return new Promise((resolve,reject) => {
            this.sourceDB.registerFor(this.id)
            .then(newRegistrations => {
                for (const uid in newRegistrations) this.registrations[uid] = newRegistrations[uid];
                resolve();
            })
            .catch(reject);
        });
    }

    /** De-registers the current user from this event. */
    public deregister():Promise<void> {
        return new Promise((resolve,reject) => {
            this.sourceDB.deregisterFor(this.id)
            .then(newRegistrations => {
                for (const uid in this.registrations) delete this.registrations[uid];
                for (const uid in newRegistrations) this.registrations[uid] = newRegistrations[uid];
                resolve();
            })
            .catch(reject);
        });
    }

    public toggleRegistered(userId:string):Promise<boolean> {
        return new Promise((resolve,reject) => {
            if (this.isRegistered(userId)) this.deregister()
                .then(() => resolve(false))
                .catch(reject);
            else this.register()
                .then(() => resolve(true))
                .catch(reject);
        });
    }

}

/** EventFilterOptions specify conditions which are supposed to be met by an event. */
export type EventFilterOptions = QueryOptions & {
    range?: { from: Date; to: Date; } | { from?: Date; to: Date; } | { from: Date; to?: Date; };
    category?: string;
};

/** An EventDatabase provides a way to interface with a collection of event data. */
export default abstract class EventDatabase {

    abstract count(options?: Omit<EventFilterOptions, "range">): Promise<number>;

    abstract getRange(from?: Date, to?: Date, options?: Omit<EventFilterOptions, "range">): Promise<EventInfo[]>;

    abstract getById(id: string): Promise<EventInfo | undefined>;

    abstract getByCategory(category: string, options?: Omit<EventFilterOptions, "category">): Promise<EventInfo[]>;

    abstract registerFor(eventId:string):Promise<Record<string,string>>;
    abstract deregisterFor(eventId:string):Promise<Record<string,string>>;

}
