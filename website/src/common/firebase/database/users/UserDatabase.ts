import { Permission } from "../Permission";
import QueryOptions from "../QueryOptions";

export type UserFilterOptions = QueryOptions & {
    joined_before?: Date;
    joined_after?: Date;
    is_member?: boolean;
    has_permission?: Permission|Permission[];
};

export class UserInfo {
    public readonly id:string;
    public readonly joined_at:Date;
    public readonly member_until?:Date;
    public readonly first_name:string;
    public readonly family_name:string;
    public readonly permissions:Permission[];

    constructor(id:string, joined_at:Date, member_until:Date|undefined, first_name:string, family_name:string, permissions:Permission[]) {
        this.id = id;
        this.joined_at = joined_at;
        this.member_until = member_until;
        this.first_name = first_name;
        this.family_name = family_name;
        this.permissions = permissions;
    }

    public satisfies(options:UserFilterOptions):boolean {
        if (options.has_permission) {
            if (Array.isArray(options.has_permission)) {
               if ( options.has_permission.some(p => !this.permissions.includes(p))) return false;
            }
            else if (!this.permissions.includes(options.has_permission)) return false;
        }
        if (options.id && options.id !== this.id) return false;
        else if (options.is_member && this.member_until === undefined) return false;
        else if (options.joined_after && options.joined_after >= this.joined_at) return false;
        else if (options.joined_before && options.joined_before <= this.joined_at) return false;
        else if (options.limit === 0) return false;
        else if (options.notId && options.notId === this.id) return false;
        else return true;
    }

}

export default abstract class UserDatabase {
    abstract get(limit: number, options?: Omit<UserFilterOptions, "limit">): Promise<UserInfo[]>;

    abstract count(options?: UserFilterOptions): Promise<number>;

    abstract getById(id: string): Promise<UserInfo | undefined>;
}