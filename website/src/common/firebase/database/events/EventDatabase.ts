import ColorUtil from "../../../util/ColorUtil";
import DateUtil from "../../../util/DateUtil";
import ObjectUtil from "../../../util/ObjectUtil";
import StringUtil from "../../../util/StringUtil";
import { Class, Opt } from "../../../util/UtilTypes";
import { checkPermissions } from "../../authentication/permission-based-redirect";
import Database, { Info, QueryFilter } from "../Database";
import Permissions from "../Permissions";

/** An EventInfo object contains all relevant information of an event.  */
export class EventInfo extends Info {
    
    /** The Database from where the EventInfo was retrieved. */
    public readonly sourceDB:EventDatabase;

    public readonly name:string;
    public readonly description:string;
    public readonly category:string;

    public readonly starts_at:Date;
    public readonly ends_at:Date;

    public override readonly components:EventInfo.Component[];

    constructor(
        sourceDB:EventDatabase,
        id = StringUtil.generateID(),
        name:string,
        description:string,
        category="",
        timespan:DateUtil.Timespan,
        components:EventInfo.Component[]
    ) {
        super(id, components);
        this.components = components;
        this.sourceDB = sourceDB;
        
        this.name = name;
        this.description = description;
        this.category = category;

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

    public isValid():boolean {
        return this.name.length !== 0
            && this.starts_at <= this.ends_at
            && this.components.every(c => c.validate(this));
    }

    public override copy():EventInfo {
        return new EventInfo(
            this.sourceDB,
            this.id,
            this.name,
            this.description,
            this.category,
            [new Date(this.starts_at), new Date(this.ends_at)],
            this.components.map(c => c.copy())
        );
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
            // only accurate to seconds
            && Math.floor(other.starts_at.getTime() / 1000) === Math.floor(this.starts_at.getTime() / 1000)
            && Math.floor(other.ends_at.getTime() / 1000) === Math.floor(this.ends_at.getTime() / 1000);
    }

}

export namespace EventInfo {

    export type Component = Info.Component<EventInfo>;

    /** Namespace containing all event component classes. */
    export namespace Components {

        export class Color extends Info.Component<EventInfo> {
            public override readonly Class = Color;
            public override readonly dependencies = [];
            public override readonly translatedName = "Achtergrondkleur";

            private _bg!:ColorUtil.HexColor;
            public get bg() { return this._bg; }
            public set bg(newBG:ColorUtil.HexColor) {
                if (!ColorUtil.isHex(newBG)) throw new TypeError(`value "${newBG}" is now a HexColor`);
                else this._bg = newBG;
            }

            constructor(bg:ColorUtil.HexColor) {
                super();
                Object.freeze(this.dependencies);
                this.bg = bg;
            }

            public override copy():Color {
                return new Color(this.bg);
            }

            public override validateValues() { return ColorUtil.isHex(this.bg); }

        }

        export class Registerable extends Info.Component<EventInfo> {
            private static CAN_READ_COMMENTS?:boolean;
            private static CAN_REGISTER?:boolean;
            private static CAN_DEREGISTER?:boolean;
            private static fetchPermissions() {
                return checkPermissions([
                    Permissions.Permission.READ_EVENT_COMMENTS,
                    Permissions.Permission.REGISTER_FOR_EVENTS,
                    Permissions.Permission.DEREGISTER_FOR_EVENTS
                ])
                .then(res => {
                    this.CAN_READ_COMMENTS = res.READ_EVENT_COMMENTS;
                    this.CAN_REGISTER = res.REGISTER_FOR_EVENTS;
                    this.CAN_DEREGISTER = res.DEREGISTER_FOR_EVENTS;
                    return res;
                });
            }
            public static checkCanReadComments():Promise<boolean> {
                return this.CAN_READ_COMMENTS === undefined ? this.fetchPermissions().then(res => res.READ_EVENT_COMMENTS) : Promise.resolve(this.CAN_READ_COMMENTS);
            }
            public static checkCanRegister():Promise<boolean> {
                return this.CAN_REGISTER === undefined ? this.fetchPermissions().then(res => res.REGISTER_FOR_EVENTS) : Promise.resolve(this.CAN_REGISTER);
            }
            public static checkCanDeregister():Promise<boolean> {
                return this.CAN_DEREGISTER === undefined ? this.fetchPermissions().then(res => res.DEREGISTER_FOR_EVENTS) : Promise.resolve(this.CAN_DEREGISTER);
            }

            public override readonly Class = Registerable;
            public override readonly dependencies:Class<Component>[] = [];
            public override readonly translatedName:string = "Inschrijfbaar voor leden";

            private _registrations:Record<string,string>;
            public get registrations() { return { ...this._registrations } }
            public get registeredNames() { return Object.values(this._registrations); }
            public get numRegistrations() { return ObjectUtil.sizeOf(this._registrations); }
            public isRegistered(id:string) { return id in this._registrations; }

            private _capacity?:number;
            /** Maximum number of registrations */
            public get capacity() { return this._capacity; }
            public set capacity(newCap:number|undefined) {
                if (newCap !== undefined && newCap < this.numRegistrations) {
                    throw new Error("Capacity must be greater or equal to the number of registrations");
                }
                else this._capacity = newCap;
            }

            constructor(registrations:Record<string,string>, capacity?:number) {
                super();
                this._registrations = { ...registrations };
                this.capacity = capacity;
            }

            public override canBeRemovedFrom(ev:EventInfo) {
                return super.canBeRemovedFrom(ev)
                    && this.numRegistrations === 0;
            }

            public getCommentsFor(ev:EventInfo):Promise<Record<string,Registerable.Comment>> {
                return Registerable.checkCanReadComments().then(res => res ? ev.sourceDB.getCommentsFor(ev) : {});
            }

            public register(ev:EventInfo, comment:string):Promise<void> {
                return ev.sourceDB.registerFor(ev, comment)
                    .then(([id, name]) => {
                        this._registrations[id] = name;
                    });
            }

            public deregister(ev:EventInfo):Promise<void> {
                return ev.sourceDB.deregisterFor(ev)
                    .then(id => {
                        delete this._registrations[id];
                    });
            }

            public override copy():Registerable {
                return new Registerable({...this._registrations}, this.capacity);
            }

            protected override validateValues(ev: EventInfo):boolean { // extra check
                return this._capacity === undefined || ObjectUtil.sizeOf(this._registrations) < this._capacity;
            }
        }

        export namespace Registerable {
            export interface Comment {
                id:string,
                body:string,
                created_at:Date
            }
        }

        export class RegistrationStart extends Info.Component<EventInfo> {
            public override readonly Class = RegistrationStart;
            public override dependencies = [Registerable];
            public override translatedName:string = "Startmoment voor inschrijving";

            public moment:Date;

            constructor(moment:Date) {
                super();
                this.moment = moment;
            }

            public isNow() { return Date.now() >= this.moment.getTime(); }

            public override copy():RegistrationStart {
                return new RegistrationStart(new Date(this.moment));
            }

            protected override validateValues(ev:EventInfo):boolean {
                return this.moment < ev.ends_at;
            }
        }

        export class RegistrationEnd extends Info.Component<EventInfo> {
            public override readonly Class = RegistrationEnd;
            public override dependencies = [Registerable];
            public override translatedName:string = "Eindmoment voor inschrijving";

            public moment:Date;

            constructor(moment:Date) {
                super();
                this.moment = moment;
            }

            public isNow() { return Date.now() <= this.moment.getTime(); }

            public override copy():RegistrationEnd {
                return new RegistrationEnd(new Date(this.moment));
            }

            protected override validateValues(ev:EventInfo):boolean {
                return this.moment < ev.ends_at;
            }
        }

        export class Cost extends Info.Component<EventInfo> {
            public override readonly Class = Cost;
            public override readonly dependencies = [Registerable];
            public override readonly translatedName:string = "Activiteit kost geld";

            private _cost!:number;
            /** Cost (in eurocents) */
            public get cost() { return this._cost; }
            public set cost(newCost:number) {
                if (Number.isNaN(newCost)) throw new Error("new cost cannot be NaN");
                else if (!Number.isFinite(newCost)) throw new Error("new cost must be finite");
                else if (newCost % 1 !== 0) throw new Error(`cost must be in whole cents (${newCost} is not)`);
                else if (newCost <= 0) throw new Error(`cost must be greater than 0 (${newCost} is not)`);
                else this._cost = newCost;
            }

            constructor(cost:number) {
                super();
                this.cost = cost;
            }

            public override copy():Cost {
                return new Cost(this.cost);
            }

            public override validateValues(ev: EventInfo):boolean {
                return this._cost > 0 && this._cost % 1 === 0;
            }

            public override canBeAddedTo(ev:EventInfo) {
                const regComp = ev.getComponent(EventInfo.Components.Registerable);
                // cannot be added if members already registered, since they didn't accept the costs
                return super.canBeAddedTo(ev) && (regComp === undefined || regComp.numRegistrations === 0);
            }

        }

    }

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

    protected abstract doRegisterFor(ev:EventInfo, comment?:string):Promise<[string,string]>;
    public registerFor(event:EventInfo, comment?:string) {
        if (!event.hasComponent(EventInfo.Components.Registerable)) throw new Error("event is not registerable");
        else return this.doRegisterFor(event, comment);
    }
    protected abstract doDeregisterFor(ev:EventInfo):Promise<string>;
    public deregisterFor(event:EventInfo) {
        if (!event.hasComponent(EventInfo.Components.Registerable)) throw new Error("event is not registerable");
        else return this.doDeregisterFor(event);
    }

    protected abstract fetchCommentsFor(event:EventInfo):Promise<Record<string,EventInfo.Components.Registerable.Comment>>;
    public getCommentsFor(event:EventInfo) {
        if (!event.hasComponent(EventInfo.Components.Registerable)) throw new Error("event is not registerable");
        else return this.fetchCommentsFor(event);
    }

}
