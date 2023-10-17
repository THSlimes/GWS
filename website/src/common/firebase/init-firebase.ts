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