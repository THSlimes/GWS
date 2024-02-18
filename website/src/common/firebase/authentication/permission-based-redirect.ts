import Permission from "../database/Permission";
import { onAuth } from "../init-firebase";
import { FirestoreUserDatabase } from "../database/users/FirestoreUserDatabase";
import UserDatabase from "../database/users/UserDatabase";
import Cache from "../../Cache";
import ObjectUtil from "../../util/ObjectUtil";

function toArray<P extends Permission>(perm:P|P[]):P[] {
    return Array.isArray(perm) ? perm : [perm];
}

const USER_DB: UserDatabase = new FirestoreUserDatabase();

type PermissionCheckResults<P extends Permission> = {[key in P]:boolean };
function hasPermissions<P extends Permission>(perm:P[], userId:string, useCache:boolean):Promise<PermissionCheckResults<P>> {
    const userPermsPromise = new Promise<Permission[]>((resolve,reject) => { // get user permissions
        if (useCache) {
            const cachedUserPerms = Cache.get(`permissions-${userId}`);
            if (cachedUserPerms) resolve(cachedUserPerms);
            else reject(new Error(`useCache is true, but permissions of user ${userId} are not in the cache`));
        }
        else USER_DB.getById(userId)
            .then(userInfo => resolve(userInfo?.permissions ?? []))
            .catch(reject);
    });

    return new Promise((resolve, reject) => {
        userPermsPromise.then(userPerms => {
            resolve(ObjectUtil.mapToObject(perm, p => userPerms.includes(p)));
        })
        .catch(reject);
    });
}

export function checkPermissions<P extends Permission>(perms:P|P[], useCache=false):Promise<PermissionCheckResults<P>> {
    const permArr = toArray(perms);

    return new Promise((resolve, reject) => {
        onAuth()
        .then(user => {
            if (user) {
                if (useCache) hasPermissions(permArr, user.uid, true) // try to use cache
                    .then(resolve) // got from cache
                    .catch(() => hasPermissions(permArr, user.uid, false).then(resolve).catch(reject)); // not in cache, get from DB
                else hasPermissions(permArr, user.uid, false).then(resolve).catch(reject); // get from DB
            }
            else resolve(ObjectUtil.mapToObject(permArr, p => false));
        })
        .catch(reject);
    });
}

type PermissionCheckMode = "all" | "any";
export function onPermissionCheck<P extends Permission>(perms:P|P[], callback:(hasPerms:boolean, res:PermissionCheckResults<P>)=>void, useCache=false, callAgain=true, mode:PermissionCheckMode="all"):void {
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

/**
 * Redirects the user to the given URL in case they do not have all of the given permissions.
 * @param url url to redirect to
 * @param permissions permissions to check for
 * @param [useCache=false] whether to use cached value when available
 * @param [callAgain=true] whether to check with the actual value, even after using the cached one
 */

export function redirectIfMissingPermission(url='/', permissions: Permission | Permission[], useCache=false, callAgain=true, mode:PermissionCheckMode="all"):void {
    onPermissionCheck(permissions, res => {
        if (!res) location.replace(url);
    }, useCache, callAgain, mode);
}
