import Permissions from "./firebase/database/Permissions";
import { ImagedLink, LinkTree } from "./firebase/database/settings/SettingsDatabase";
import { EmojiConfig } from "./Loading";
import UserFeedback from "./ui/UserFeedback";
import ColorUtil from "./util/ColorUtil";

/**
 * The Cache helper-class provides a way to more easily cache values
 * to localStorage.
 */
export default abstract class Cache {
    
    // TODO: fix before Sat Sep 13 275760 02:00:00 GMT+0200
    private static readonly MAX_VALID_TIMESTAMP = 8640000000000000;

    /** Checks whether the given key has been assigned a value. */
    public static has(key:Cache.Key) {
        return this.get(key) !== null;
    }

    /**
     * Retrieves the value associated with the given key
     * @param key key associated with the cached value
     * @param [returnIfInvalidated=false] whether to still return the cached value, even if it is expired
     * (the cached value is still removed afterwards)
     * @returns value in cache, or null if no value is stored for given key
     */
    public static get<K extends Cache.Key>(key:K, returnIfInvalidated=false):Cache.KeyTypeMap[K] | null {
        if (localStorage.getItem(key) === null) return null; // object not in cache
        else {
            const entry = JSON.parse(localStorage.getItem(key)!) as Cache.Entry<K>;
            const isExpired = Date.now() > entry[1];
            if (isExpired) localStorage.removeItem(key); // expired, remove from cache

            return !isExpired || returnIfInvalidated ? entry[0] : null;
        }
    };

    /**
     * Gets the value associated with the given key. If the value is not cached, the given Promise is used to query it.
     * In case the value was invalidated after getting, the Promise is used to get its new value.
     * @param key cache key
     * @param refreshPromise Promise to query the current, actual value
     * @param refreshFrequency how long to the refreshed value is valid (ms, default is 6 hours)
     * @returns Promise that resolves with the cached value associated with the given key
     */
    public static getAndRefresh<K extends Cache.Key>(key:K, refreshPromise:Promise<Cache.KeyTypeMap[K]>, refreshFrequency=6*60*60*1000):Promise<Cache.KeyTypeMap[K]> {
        const cachedValue = this.get(key, true);
        if (cachedValue === null) { // no cached value, get with promise
            return refreshPromise
                .then(realValue => {
                    this.set(key, realValue, Date.now() + refreshFrequency);
                    return realValue;
                });
        }
        else {
            if (!this.has(key)) {
                refreshPromise // value invalidated after getting, get new value
                .then(newValue => this.set(key, newValue, Date.now() + refreshFrequency))
                .catch(console.error);
            }
            return Promise.resolve(cachedValue);
        }
    }

    /**
     * Assigns a new value to be associated with the given key.
     * @param key
     * @param value new value
     * @param [expires_at=MAX_VALID_TIMESTAMP] UNIX timestamp at which the value is no longer valid
     * @returns old value associated with the key (null if none was present)
     */
    public static set<K extends Cache.Key>(key:K, value:Cache.KeyTypeMap[K], expires_at:Date|number=Cache.MAX_VALID_TIMESTAMP):Cache.KeyTypeMap[K]|null {
        const prevValue = this.get(key);

        const newEntry:Cache.Entry<K> = [value, expires_at instanceof Date ? expires_at.getTime() : expires_at];
        localStorage.setItem(key, JSON.stringify(newEntry)); // save to localStorage

        return prevValue;
    }

    public static remove<K extends Cache.Key>(key:K):Cache.KeyTypeMap[K]|null {
        const prevValue = this.get(key);
        localStorage.removeItem(key);
        return prevValue;
    }

}

namespace Cache {
    /** A type that maps cache keys to their value type */
    export type KeyTypeMap = {
        "navbar-links": LinkTree,
        "sponsor-links": ImagedLink[],
        "social-media-links": ImagedLink[],
        "default-category-colors": ColorUtil.HexColor[],
        "loading-screen-config-fixed": EmojiConfig,
        "is-logged-in": true,
        "do-login-expiry": boolean,
        "own-id": string,
        "relayed-message": UserFeedback.MessageData,
        [key:`permissions-${string}`]: Permissions.Permission[]
    };
    /** Union type of all cache keys */
    export type Key = keyof KeyTypeMap;
    
    /** [value, UNIX expiry timestamp] pair */
    export type Entry<K extends keyof KeyTypeMap> = [KeyTypeMap[K], number];
}