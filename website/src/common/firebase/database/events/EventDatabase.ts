import { HexColor } from "../../../html-element-factory/AssemblyLine";
import { QueryOptions } from "../database-def";

export class EventInfo {
    public readonly id:string;
    public readonly name:string;
    public readonly description:string;
    public readonly starts_at:Date;
    public readonly ends_at:Date;
    public readonly category:string;
    public readonly color?:HexColor;

    constructor(id:string, name:string, description:string, starts_at:Date, ends_at:Date, category:string, color?:HexColor) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.starts_at = starts_at;
        this.ends_at = ends_at;
        this.category = category;
        this.color = color;
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
