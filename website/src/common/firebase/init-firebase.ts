import { User, getAuth } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from "@firebase/storage";
import { FirebaseOptions, initializeApp } from "firebase/app";

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

export const DB = getFirestore(FIREBASE_APP); // initialize Firebase Firestore

export const AUTH = getAuth(FIREBASE_APP);
AUTH.onAuthStateChanged(user => {
    user === null ? localStorage.removeItem("loggedIn") : localStorage.setItem("loggedIn", "true");
});

export function onAuth():Promise<User|null> {
    return new Promise((resolve,reject) => {
        AUTH.authStateReady()
        .then(() => resolve(AUTH.currentUser))
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
    if (useCache) callback(localStorage.getItem("loggedIn") === "true"); // use cached value
    if (!useCache || callAgain) onAuth()
        .then(user => callback(user !== null));
}

export const STORAGE = getStorage(FIREBASE_APP);