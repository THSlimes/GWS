import ColorUtil from "../../../util/ColorUtil";
import DateUtil from "../../../util/DateUtil";
import ObjectUtil from "../../../util/ObjectUtil";
import StringUtil from "../../../util/StringUtil";
import { Opt } from "../../../util/UtilTypes";
import Database, { Info, QueryFilter } from "../Database";

/** An EventInfo object contains all relevant information of an event.  */
export class EventInfo extends Info {
    
    /** The Database from where the EventInfo was retrieved. */
    public readonly sourceDB:EventDatabase;

    public readonly name:string;
    public readonly description:string;
    public readonly category:string;
    public readonly color?:ColorUtil.HexColor;

    public readonly starts_at:Date;
    public readonly ends_at:Date;

    constructor(
        sourceDB:EventDatabase,
        id = StringUtil.generateID(),
        name:string,
        description:string,
        category="",
        color:Opt<ColorUtil.HexColor>=undefined,
        timespan:DateUtil.Timespan
    ) {
        super(id);
        this.sourceDB = sourceDB;
        
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

    public overlapsWith(other:EventInfo) {
        return DateUtil.Timespans.overlap([this.starts_at, this.ends_at], [other.starts_at, other.ends_at]);
    }

    public daysOverlapsWith(other:EventInfo) {
        return DateUtil.Timespans.daysOverlap([this.starts_at, this.ends_at], [other.starts_at, other.ends_at]);
    }

    /** Whether this event matches the given filter. */
    public override satisfies(options:EventQueryFilter):boolean {
        if (!super.satisfies(options)) return false;
        if (options.range) {
            if (options.range.from && this.starts_at < options.range.from && this.ends_at < options.range.from) return false;
            if (options.range.to && this.starts_at > options.range.to && this.ends_at > options.range.to) return false;
        }
        if (options.category && this.category !== options.category) return false;
        
        return true;
    }

    public override equals(other:EventInfo): boolean {
        return super.equals(other)
            && other.name === this.name
            && other.description === this.description
            && other.category === this.category
            && other.color === this.color
            // only accurate to seconds
            && Math.floor(other.starts_at.getTime() / 1000) === Math.floor(this.starts_at.getTime() / 1000)
            && Math.floor(other.ends_at.getTime() / 1000) === Math.floor(this.ends_at.getTime() / 1000);
    }

}

/** RegisterableEventInfo is a type of EventInfo for which a user is able to register. */
export class RegisterableEventInfo extends EventInfo {

    public readonly registrations:Record<string,string>;
    public readonly capacity?:number;
    public readonly can_register_from?:Date;
    public readonly can_register_until?:Date;
    public readonly requires_payment:boolean;

    constructor(
        sourceDB:EventDatabase,
        id = StringUtil.generateID(),
        name:string,
        description:string,
        category="",
        color:Opt<ColorUtil.HexColor>=undefined,
        timespan:DateUtil.Timespan,

        registrations:Record<string,string>,
        requires_payment:boolean,
        capacity?:number,
        registration_period?:DateUtil.OpenTimespan
    ) {
        super(sourceDB, id, name, description, category, color, timespan);

        this.registrations = registrations;
        this.requires_payment = requires_payment
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
    public register(comment?:string):Promise<void> {
        return new Promise((resolve,reject) => {
            this.sourceDB.registerFor(this, comment)
            .then(([id, name]) => {
                this.registrations[id] = name;
                if (this.cachedComments && comment) this.cachedComments[id] = { id, created_at: new Date(), body: comment }; // cache comment
                resolve();
            })
            .catch(reject);
        });
    }

    /** De-registers the current user from this event. */
    public deregister():Promise<void> {
        return new Promise((resolve,reject) => {
            this.sourceDB.deregisterFor(this)
            .then(id => {
                delete this.registrations[id];
                if (this.cachedComments) delete this.cachedComments[id];
                resolve();
            })
            .catch(reject);
        });
    }

    public toggleRegistered(userId:string, comment?:string):Promise<boolean> {
        return new Promise((resolve,reject) => {
            if (this.isRegistered(userId)) this.deregister()
                .then(() => resolve(false))
                .catch(reject);
            else this.register(comment)
                .then(() => resolve(true))
                .catch(reject);
        });
    }

    private cachedComments?:Record<string,EventComment>;
    public getComments():Promise<Record<string,EventComment>> {
        return new Promise((resolve, reject) => {
            if (this.cachedComments !== undefined) resolve(this.cachedComments);
            else this.sourceDB.getCommentsFor(this)
                .then(comments => resolve(this.cachedComments = comments))
                .catch(reject);
        });
    }

    public static fromSuper(event:EventInfo, registrations:Record<string,string>, requires_payment:boolean, capacity?:number, registration_period?:DateUtil.OpenTimespan) {
        return new RegisterableEventInfo(
            event.sourceDB,
            event.id,
            event.name,
            event.description,
            event.category,
            event.color,
            [event.starts_at, event.ends_at],
            registrations,
            requires_payment,
            capacity,
            registration_period
        );
    }

    public override equals(other:RegisterableEventInfo):boolean {
        return super.equals(other)
            && ObjectUtil.deepEquals(other.registrations, this.registrations)
            && other.capacity === this.capacity
            && other.can_register_from?.getTime() === this.can_register_from?.getTime()
            && other.can_register_until?.getTime() === this.can_register_until?.getTime()
            && other.requires_payment === this.requires_payment;
    }

}

export interface EventComment {
    id:string,
    body:string,
    created_at:Date
}

/** EventFilterOptions specify conditions which are supposed to be met by an event. */
export type EventQueryFilter = QueryFilter & {
    range?: { from: Date; to: Date; } | { from?: Date; to: Date; } | { from: Date; to?: Date; };
    category?: string;
};

/** An EventDatabase provides a way to interface with a collection of event data. */
export default abstract class EventDatabase extends Database<EventInfo> {

    abstract override get(options?:EventQueryFilter): Promise<EventInfo[]>;
    abstract override count(options?:EventQueryFilter): Promise<number>;
    protected abstract override doWrite(...records: EventInfo[]): Promise<number>;
    protected abstract override doDelete(...records: EventInfo[]): Promise<number>;

    abstract getRange(from?: Date, to?: Date, options?: Omit<EventQueryFilter, "range">): Promise<EventInfo[]>;

    abstract getByCategory(category: string, options?: Omit<EventQueryFilter, "category">): Promise<EventInfo[]>;

    abstract registerFor(event:RegisterableEventInfo, comment?:string):Promise<[string,string]>;
    abstract deregisterFor(event:RegisterableEventInfo):Promise<string>;

    /**
     * Retrieves the comments of an event.
     * @param event event to fetch comments for
     * @returns a Promise which resolves with a mapping from user ids to their comment
     */
    abstract getCommentsFor(event:RegisterableEventInfo):Promise<Record<string,EventComment>>;

}
