import Database, { Info, QueryFilter } from "../Database";
import Permission from "../Permission";

export class UserInfo extends Info {
    
    public readonly joined_at:Date;
    public readonly member_until:Date;
    public readonly first_name:string;
    public readonly family_name:string;
    public readonly permissions:Permission[];

    constructor(id:string, joined_at:Date, member_until:Date, first_name:string, family_name:string, permissions:Permission[]) {
        super(id);

        this.joined_at = joined_at;
        this.member_until = member_until;
        this.first_name = first_name;
        this.family_name = family_name;
        this.permissions = permissions;
    }

    /** Combination of `this.first_name` and `this.family_name`. */
    public get fullName() { return `${this.first_name} ${this.family_name}`; }

    public satisfies(options:UserQueryFilter):boolean {
        if (!super.satisfies(options)) return false;
        else if (options.has_permission) {
            if (Array.isArray(options.has_permission)) {
               if ( options.has_permission.some(p => !this.permissions.includes(p))) return false;
            }
            else if (!this.permissions.includes(options.has_permission)) return false;
        }
        
        if (options.is_member && this.member_until === undefined) return false;
        else if (options.joined_after && options.joined_after >= this.joined_at) return false;
        else if (options.joined_before && options.joined_before <= this.joined_at) return false;
        else return true;
    }

}

export type UserQueryFilter = QueryFilter & {
    joined_before?: Date;
    joined_after?: Date;
    is_member?: boolean;
    has_permission?: Permission|Permission[];
};


export default abstract class UserDatabase extends Database<UserInfo> {

    abstract get(options?:UserQueryFilter): Promise<UserInfo[]>;
    abstract count(options?:UserQueryFilter): Promise<number>;
    abstract getByIds<S extends string>(...ids:S[]): Promise<{[id in S]?: UserInfo}>;
    abstract doWrite(...records: UserInfo[]): Promise<number>;
    abstract doDelete(...records: UserInfo[]): Promise<number>;

}