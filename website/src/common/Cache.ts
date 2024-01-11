import Permission from "./firebase/database/Permission";

type CacheKeyMap = {
    "is-logged-in": true,
    "own-id": string,
    [key:`permissions-${string}`]: Permission[];
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
     * @param key
     * @returns value in cache, or null if no value is stored for given key
     */
    public static get<K extends CacheKey>(key:K):CacheKeyMap[K] | null {
        if (localStorage.getItem(key) === null) return null;
        else {
            const entry = JSON.parse(localStorage.getItem(key)!) as CacheEntry<K>;
            if (Date.now() > entry[1]) { // expired
                localStorage.removeItem(key);
                return null;
            }
            else return entry[0]; // not yet expired
        }
    };

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