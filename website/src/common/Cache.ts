import Permission from "./firebase/database/Permission";
import { ImagedLink, LinkTree } from "./firebase/database/settings/SettingsDatabase";

type CacheKeyMap = {
    "navbar-links": LinkTree,
    "sponsor-links": ImagedLink[],
    "social-media-links": ImagedLink[],
    "is-logged-in": true,
    "own-id": string,
    [key:`permissions-${string}`]: Permission[]
};
type CacheKey = keyof CacheKeyMap;

/** [value, UNIX expiry timestamp] pair */
type CacheEntry<K extends keyof CacheKeyMap> = [CacheKeyMap[K], number];

// TODO: fix before Sat Sep 13 275760 02:00:00 GMT+0200
const MAX_VALID_TIMESTAMP = 8640000000000000;

/**
 * The Cache helper-class provides a way to more easily cache values
 * to localStorage.
 */
export default abstract class Cache {

    /** Checks whether the given key has been assigned a value. */
    public static has(key:CacheKey) {
        return this.get(key) !== null;
    }

    /**
     * Retrieves the value associated with the given key
     * @param key key associated with the cached value
     * @param [returnIfInvalidated=false] whether to still return the cached value, even if it is expired
     * (the cached value is still removed afterwards)
     * @returns value in cache, or null if no value is stored for given key
     */
    public static get<K extends CacheKey>(key:K, returnIfInvalidated=false):CacheKeyMap[K] | null {
        if (localStorage.getItem(key) === null) return null; // object not in cache
        else {
            const entry = JSON.parse(localStorage.getItem(key)!) as CacheEntry<K>;
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
    public static getAndRefresh<K extends CacheKey>(key:K, refreshPromise:Promise<CacheKeyMap[K]>, refreshFrequency=6*60*60*1000):Promise<CacheKeyMap[K]> {
        return new Promise((resolve, reject) => {
            const cachedValue = this.get(key, true);
            if (cachedValue === null) refreshPromise
                .then(realValue => { // not in cache, use Promise
                    this.set(key, realValue, Date.now() + refreshFrequency);
                    resolve(realValue);
                })
                .catch(reject);
            else { // has cached value, use it
                resolve(cachedValue);
                if (!this.has(key)) refreshPromise // value invalidated after getting, get new value
                    .then(newValue => this.set(key, newValue, Date.now() + refreshFrequency))
                    .catch(console.error);
            }
        });
    }

    /**
     * Assigns a new value to be associated with the given key.
     * @param key
     * @param value new value
     * @param [expires_at=MAX_VALID_TIMESTAMP] UNIX timestamp at which the value is no longer valid
     * @returns old value associated with the key (null if none was present)
     */
    public static set<K extends CacheKey>(key:K, value:CacheKeyMap[K], expires_at:Date|number=MAX_VALID_TIMESTAMP):CacheKeyMap[K]|null {
        const prevValue = this.get(key);

        const newEntry:CacheEntry<K> = [value, expires_at instanceof Date ? expires_at.getTime() : expires_at];
        localStorage.setItem(key, JSON.stringify(newEntry)); // save to localStorage

        return prevValue;
    }

    public static remove<K extends CacheKey>(key:K):CacheKeyMap[K]|null {
        const prevValue = this.get(key);
        localStorage.removeItem(key);
        return prevValue;
    }

}