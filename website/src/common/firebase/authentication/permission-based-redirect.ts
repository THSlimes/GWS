import Permissions from "../database/Permissions";
import { onAuth } from "../init-firebase";
import FirestoreUserDatabase from "../database/users/FirestoreUserDatabase";
import UserDatabase from "../database/users/UserDatabase";
import Cache from "../../Cache";
import ObjectUtil from "../../util/ObjectUtil";
import Loading from "../../Loading";

function toArray<P extends Permissions.Permission>(perm:P|P[]):P[] {
    return Array.isArray(perm) ? perm : [perm];
}

const USER_DB: UserDatabase = new FirestoreUserDatabase();

function hasPermissions<P extends Permissions.Permission>(perm:P[], userId:string, useCache:boolean):Promise<checkPermissions.Results<P>> {
    if (useCache) {
        const cachedUserPerms = Cache.get(`permissions-${userId}`);
        return cachedUserPerms === null ?
            Promise.reject(new Error(`useCache is true, but permissions of user ${userId} are not in the cache`)) :
            Promise.resolve(ObjectUtil.mapToObject(perm, p => cachedUserPerms.includes(p)));
    }
    else return USER_DB.getById(userId)
        .then(userInfo => {
            const perms = userInfo?.permissions ?? [];
            return ObjectUtil.mapToObject(perm, p => perms.includes(p));
        });
}

export function checkPermissions<P extends Permissions.Permission>(perms:P|P[], useCache=false):Promise<checkPermissions.Results<P>> {
    const permArr = toArray(perms);

    return onAuth()
        .then(user => {
            if (user) return useCache ?
                hasPermissions(permArr, user.uid, true) // try to use cache
                .catch(() => hasPermissions(permArr, user.uid, false)) : // not in cache, get from DB
                hasPermissions(permArr, user.uid, false); // get from DB immediately
            else return ObjectUtil.mapToObject(permArr, p => false);
        });
}
namespace checkPermissions {
    export type Results<P extends Permissions.Permission> = { [key in P]:boolean };
}

export function onPermissionCheck<P extends Permissions.Permission>(perms:P|P[], callback:(hasPerms:boolean, res:checkPermissions.Results<P>)=>void, useCache=false, callAgain=true, mode:onPermissionCheck.Mode="all"):void {
    const permArr = toArray(perms);

    onAuth()
    .then(user => {
        if (Array.isArray(perms) && perms.length === 0) callback(true, ObjectUtil.mapToObject(perms, () => false));
        else if (user) {
            if (useCache) hasPermissions(permArr, user.uid, true) // try with cached value
                .then(res => callback(mode === "all" ? ObjectUtil.every(res, (k, v) => v) : ObjectUtil.some(res, (k, v) => v), res))
                .catch(() => {
                    if (!callAgain) callback(false, ObjectUtil.mapToObject(permArr, () => false));
                });
            if (!useCache || callAgain) hasPermissions(permArr, user.uid, false) // use actual value
                .then(res => callback(mode === "all" ? ObjectUtil.every(res, (k, v) => v) : ObjectUtil.some(res, (k, v) => v), res))
                .catch(console.error);
        }
        else callback(false, ObjectUtil.mapToObject(permArr, () => false));
    })
    .catch(console.error);
}
namespace onPermissionCheck {
    export type Mode = "all" | "any";
}

/**
 * Redirects the user to the given URL in case they do not have all of the given permissions.
 * @param url url to redirect to
 * @param permissions permissions to check for
 * @param [useCache=false] whether to use cached value when available
 * @param [callAgain=true] whether to check with the actual value, even after using the cached one
 */

export function redirectIfMissingPermission(url='/', permissions: Permissions.Permission|Permissions.Permission[], useCache=false, callAgain=true, mode:onPermissionCheck.Mode="all"):void {
    Loading.markLoadStart(redirectIfMissingPermission);
    onPermissionCheck(permissions, res => {
        if (!res) location.replace(url);
        Loading.markLoadEnd(redirectIfMissingPermission);
    }, useCache, callAgain, mode);
}
