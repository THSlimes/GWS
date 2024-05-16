import { Class } from "../../util/UtilTypes";

export abstract class Info {

    public readonly id:string;
    public readonly components:Info.Component<this>[];

    constructor(id:string, components:Info.Component<Info>[]) {
        this.id = id;
        this.components = components;
    }

    /**
     * Gets an event component by its class.
     * @param component class of component
     * @returns component (instance of `cls`, undefined if no such component exists on this event)
     */
    public getComponent<C extends Info.Component<Info>>(component:Class<C>):C|undefined {
        return component instanceof Info.Component ?
            this.components.find(comp => comp === component) as C|undefined :
            this.components.find(comp => comp instanceof component) as C|undefined;
    }
    public hasComponent(component:Class<Info.Component<Info>>):boolean { return this.getComponent(component) !== undefined; }

    public abstract copy():Info;

    public satisfies(options:QueryFilter<Info>) {
        if (options.id && this.id !== options.id) return false;
        else if (options.notId && this.id === options.notId) return false;
        else if (options.limit === 0) return false;
        else return true;
    }

    public equals(other:Info) {
        return other.id === this.id;
    }

}

export namespace Info {

    export abstract class Component<I extends Info = Info> {

        public abstract readonly Class:Class<Component<I>>;

        public abstract readonly dependencies:Class<Component<I>>[];
        public abstract readonly translatedName:string;

        public abstract copy():Component<I>;

        protected abstract validateValues(ev:I):boolean;

        /** Checks whether the component dependencies and values are valid */
        public validate(ev:I) {
            return this.dependencies.every(dep => ev.components.some(comp => comp instanceof dep)) && this.validateValues(ev);
        }

        /** Whether this Component can be removed. */
        public canBeRemovedFrom(ev:I) {
            return ev.hasComponent(this.Class) // is component of given event
                && !ev.components.some(comp => comp.dependencies.some(dep => this instanceof dep)); // is not a dependency of another component
        }
        /** Whether is Component can be added to the given event. */
        public canBeAddedTo(ev:I) {
            return this.dependencies.every(dep => ev.hasComponent(dep))
                && !ev.hasComponent(this.Class);
        }

    }

    export namespace Component {
        export interface Factory<I extends Info, Name extends string, Comp extends Component<I>, NCMap extends Record<Name,Comp>> {

            /** Creates a component instance with the given name and info object. */
            create<N extends Name>(name:N, info:I):NCMap[N];

        }
    }

}

export type QueryFilter<I extends Info = Info> = {
    /** Maximum number of retrieved records. */
    limit?: number;
    /** Specific ID of record to be retrieved. */
    id?: string;
    /** Specific ID excluded from retrieved records. */
    notId?: string;
};

export default abstract class Database<I extends Info> {

    /**
     * Retrieves the record with the given ID 'id'.
     * @param id ID of the record to be retrieved
     * @returns Promise that resolves with the data record (or undefined if no
     * record with the given ID exists)
     */
    public abstract getById(id:string):Promise<I|undefined>;

    /**
     * Retrieves all records matching the given filter.
     * @param options query filter
     * @returns Promise that resolves with the requested records
     */
    public abstract get(options?:QueryFilter<I>):Promise<I[]>;
    
    /**
     * Counts how many records match the given filter.
     * @param options query filter
     * @returns Promise that resolves with the number of matching records
     */
    public abstract count(options?:QueryFilter<I>):Promise<number>;

    /** Method to be implemented by subclass. */
    protected abstract doWrite(...records:I[]):Promise<number>
    private readonly writeHandlers:((...newRecords:I[])=>void)[] = [];
    public set onWrite(newHandler:(...newRecords:I[])=>void) {
        this.writeHandlers.push(newHandler);
    }

    /**
     * Writes the given records to the database. (if a record with a given ID
     * already exists, it is updated, otherwise it is created)
     * @param records data to write
     * @returns Promise that resolves with the number of edited records
     */
    public write(...records:I[]):Promise<number> {
        return this.doWrite(...records)
        .then(count => {
            this.writeHandlers.forEach(h => h(...records));
            return count;
        });
    }
    
    /** Method to be implemented by subclass. */
    protected abstract doDelete(...records:I[]):Promise<number>
    private readonly deleteHandlers:((...newRecords:I[])=>void)[] = [];
    public set onDelete(newHandler:(...newRecords:I[])=>void) {
        this.deleteHandlers.push(newHandler);
    }

    /**
     * Deletes records from the datebase.
     * @param ids IDs of records to be deleted
     * @returns Promise that resolves with the number of deleted records
     */
    public delete(...records:I[]):Promise<number> {
        return this.doDelete(...records)
            .then(count => {
                this.deleteHandlers.forEach(h => h(...records));
                return count;
            });
    }

}