import { User, getAuth, onAuthStateChanged } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from "@firebase/storage";
import { FirebaseOptions, initializeApp } from "firebase/app";
import Cache from "../Cache";
import StringUtil from "../util/StringUtil";

// initialize firebase connection
const FIREBASE_CONFIG:FirebaseOptions = {
    apiKey: "AIzaSyAr3flkC7_4DoGS1TOTlRRfQ4C64dSO4y4",
    authDomain: "test-78a52.firebaseapp.com",
    projectId: "test-78a52",
    storageBucket: "test-78a52.appspot.com",
    messagingSenderId: "766298434316",
    appId: "1:766298434316:web:0874153a0a10b5de12b729"
};
Object.freeze(FIREBASE_CONFIG);

const FIREBASE_APP = initializeApp(FIREBASE_CONFIG);
export default FIREBASE_APP;

export const FIRESTORE = getFirestore(FIREBASE_APP); // initialize Firebase Firestore

export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
if (!Cache.get("is-logged-in")) FIREBASE_AUTH.signOut();
FIREBASE_AUTH.onAuthStateChanged(user => {
    if (user === null) { // not logged in
        Cache.remove("is-logged-in");
        Cache.remove("do-login-expiry");
        Cache.remove(`permissions-${Cache.get("own-id")}`);
        Cache.remove("own-id");
    }
    else { // logged in
        if (Cache.get("do-login-expiry")) {
            Cache.set("is-logged-in", true, Date.now() + 60000);
            setInterval(() => Cache.set("is-logged-in", true, Date.now() + 60000), 30000);
        }
        else Cache.set("is-logged-in", true);
        Cache.set("own-id", user.uid);
    }
});

export function onAuth():Promise<User|null> {
    return new Promise((resolve,reject) => {
        FIREBASE_AUTH.authStateReady()
        .then(() => resolve(FIREBASE_AUTH.currentUser))
        .catch(reject);
    });
}

/**
 * Runs the callback function once the login status is known.
 * @param callback callback function
 * @param useCache whether to use the cached value instead
 * @param callAgain whether to run the callback again with the real value, after using the cached value
 */
export function checkLoginState(callback:(isLoggedIn:boolean)=>void, useCache=false, callAgain=true) {
    if (useCache) callback(Cache.get("is-logged-in") === true); // use cached value
    if (!useCache || callAgain) onAuth()
        .then(user => callback(user !== null));
}

export const STORAGE = getStorage(FIREBASE_APP);