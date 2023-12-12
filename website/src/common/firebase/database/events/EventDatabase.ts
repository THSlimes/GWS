import { HexColor } from "../../../html-element-factory/AssemblyLine";
import QueryOptions from "../QueryOptions";

type TimeSpan = [Date, Date];
type OpenTimespan = [Date|undefined, Date|undefined];
export class EventInfo {
    public readonly id:string;
    public readonly name:string;
    public readonly description:string;
    public readonly starts_at:Date;
    public readonly ends_at:Date;
    public readonly category:string;
    public readonly color?:HexColor;
    public readonly can_register_from?:Date;
    public readonly can_register_until?:Date

    constructor(id:string, name:string, description:string, timespan:TimeSpan, registrationPeriod:OpenTimespan, category="", color?:HexColor) {
        this.id = id;
        this.name = name;
        this.description = description;
        [this.starts_at, this.ends_at] = timespan;
        [this.can_register_from, this.can_register_until] = registrationPeriod;
        this.category = category;
        this.color = color;
    }

    public isNow(d=new Date()):boolean {
        return this.starts_at <= d && d <= this.ends_at;
    }

    public openForRegistration(d=new Date()):boolean {
        if (this.starts_at <= d) return false; // can only register before event
        else if (this.can_register_from && this.can_register_until) return this.can_register_from <= d && d <= this.can_register_until;
        else if (this.can_register_from) return this.can_register_from <= d;
        else if (this.can_register_until) return d <= this.can_register_until;
        else return true;
    }

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
}
