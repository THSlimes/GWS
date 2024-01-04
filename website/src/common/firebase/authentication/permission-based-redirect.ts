import { User } from "@firebase/auth";
import { Permission } from "../database/Permission";
import { onAuth } from "../init-firebase";
import { FirestoreUserDatabase } from "../database/users/FirestoreUserDatabase";
import UserDatabase from "../database/users/UserDatabase";

const USER_DB: UserDatabase = new FirestoreUserDatabase();
/**
 * Checks whether the given user has the given permissions.
 * @param user user to check permissions of
 * @param permissions permissions the user must have
 * @param useCache whether to use cached value if available
 * @returns promise that resolves with whether the user has the given permissions
 */
function hasPermissions(user: User | null, permissions: Permission[], useCache = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (permissions.length === 0) resolve(true); // anyone has >= 0 permissions
        else if (user === null) resolve(false); // non-user does not have permissions
        else if (useCache && localStorage.getItem(`permissions-${user.uid}`)) { // use cached value (if available)
            const userPerms = JSON.parse(localStorage.getItem(`permissions-${user.uid}`)!) as Permission[];
            resolve(permissions.every(p => userPerms.includes(p)));
        }
        else USER_DB.getById(user.uid) // use real value
            .then(userInfo => resolve(userInfo === undefined || permissions.every(p => userInfo.permissions.includes(p))))
            .catch(() => resolve(false));
    });
}
/**
 * Checks whether the logged-in user has the given permissions.
 * @param permissions permissions to check for
 * @param useCache whether to cached values whenever possible
 * @param callAgain whether to use the callback again with the real value, even after using the cached value already
 */

export function checkPermissions(permissions: Permission | Permission[], callback: (hasPerms: boolean) => void, useCache = false, callAgain = true): void {
    if (!Array.isArray(permissions)) return checkPermissions([permissions], callback, useCache, callAgain);
    else onAuth()
        .then(user => {
            if (useCache) hasPermissions(user, permissions, true).then(callback);
            if (!useCache || callAgain) hasPermissions(user, permissions, false).then(callback);
        });
}
/**
 * Redirects the user to the given URL in case they do not have all of the given permissions.
 * @param url url to redirect to
 * @param permissions permissions to check for
 * @param [useCache=false] whether to use cached value when available
 * @param [callAgain=true] whether to check with the actual value, even after using the cached one
 */

export function redirectIfMissingPermission(url = "/", permissions: Permission | Permission[], useCache = false, callAgain = true): void {
    checkPermissions(permissions, res => {
        if (!res) location.replace(url);
    }, useCache, callAgain);
}
