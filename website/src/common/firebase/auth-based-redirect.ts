import { User } from "@firebase/auth";
import { Permission } from "./database/Permission";
import { AUTH } from "./init-firebase";
import { FirestoreUserDatabase } from "./database/users/FirestoreUserDatabase";
import UserDatabase from "./database/users/UserDatabase";

/**
 * Redirects the user to the given URL in the case they are logged in.
 * @param url url to direct to
 * @param useCachedValue whether to use the cached login-state
 */
export function redirectIfLoggedIn(url="/", useCachedValue=false) {
    if (AUTH.currentUser !== null || (useCachedValue && localStorage.getItem("loggedIn") === "true")) location.href = url; // redirect now
    else AUTH.onAuthStateChanged(user => { // redirect later
        if (user !== null) location.replace(url);
    });
}

/**
 * Redirects the user to the given URL in the case they are NOT logged in.
 * @param url url to direct to
 * @param useCachedValue whether to use the cached login-state
 */
export function redirectIfLoggedOut(url="/", useCachedValue=false) {
    if (AUTH.currentUser === null && (useCachedValue && !localStorage.getItem("loggedIn"))) location.href = url; // redirect now
    else AUTH.onAuthStateChanged(user => { // redirect later
        if (user === null) location.replace(url);
    });
}

const USER_DB:UserDatabase = new FirestoreUserDatabase();
function hasPermissions(user:User|null, ...permissions:Permission[]):Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (user === null) resolve(false); // non-user does not have permissions
        else USER_DB.getById(user.uid)
        .then(userInfo => resolve(userInfo === undefined || permissions.every(p => userInfo.permissions.includes(p))))
        .catch(() => resolve(false));
    });
}

/**
 * Redirects the user to the given URL in case they do not have all of the given permissions.
 * @param url url to redirect to
 * @param permissions permissions to check for
 */
export function redirectIfMissingPermission(url="/", ...permissions:Permission[]) {
    if (permissions.length > 0) {
        if (AUTH.currentUser === null) AUTH.onAuthStateChanged(user => {
            if (!hasPermissions(user, ...permissions)) location.replace(url);
        });
        else if (!hasPermissions(AUTH.currentUser, ...permissions)) location.replace(url);
    }
    else console.warn("did not check permissions, because none were provided.");
}