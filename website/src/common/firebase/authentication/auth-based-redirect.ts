import Cache from "../../Cache";
import { AUTH, onAuth } from "../init-firebase";

/**
 * Redirects the user to the given URL in the case they are logged in.
 * @param url url to direct to
 * @param useCachedValue whether to use the cached login-state
 */
export function redirectIfLoggedIn(url="/", useCachedValue=false):void {
    if (AUTH.currentUser !== null || (useCachedValue && Cache.get("is-logged-in") === true)) location.href = url; // redirect now
    else onAuth()
        .then(user => {
            if (user !== null) location.replace(url);
        });
}

/**
 * Redirects the user to the given URL in the case they are NOT logged in.
 * @param url url to direct to
 * @param useCachedValue whether to use the cached login-state
 */
export function redirectIfLoggedOut(url="/", useCachedValue=false):void {
    if (AUTH.currentUser === null && (useCachedValue && Cache.get("is-logged-in") !== true)) location.href = url; // redirect now
    else onAuth()
        .then(user => {
            if (user === null) location.replace(url);
        });
}

