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
export function onAuth(callback:(user:User|null, isLoggedIn:boolean) =>void) {
    AUTH.authStateReady()
    .then(() => callback(AUTH.currentUser, AUTH.currentUser !== null))
    .catch(console.error);
}

export const STORAGE = getStorage(FIREBASE_APP);