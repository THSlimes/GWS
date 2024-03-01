import { QueryDocumentSnapshot, collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { FIRESTORE } from "../../init-firebase";
import SettingsDatabase, { LinkTree } from "./SettingsDatabase";


type DBNavbarLinks = { links: string };

export default class FirestoreSettingsDatabase extends SettingsDatabase {

    private static COLLECTION = collection(FIRESTORE, "settings");



    private static NAVBAR_LINKS_DOC = doc(this.COLLECTION, "navbar-links")
        .withConverter({
            toFirestore(links:LinkTree):DBNavbarLinks {
                return { links: JSON.stringify(links) };
            },
            fromFirestore(snapshot:QueryDocumentSnapshot<DBNavbarLinks,LinkTree>):LinkTree {
                return JSON.parse(snapshot.data().links);
            }
        });

    override getNavbarLinks(defaultLink='/'): Promise<LinkTree> {
        return new Promise((resolve, reject) => {
            getDoc(FirestoreSettingsDatabase.NAVBAR_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) throw new MissingSettingError("navbar-links");
                const data = docSnapshot.data();
                resolve(data);
            })
            .catch(reject);
        });
    }
    
    override setNavbarLinks(newLinks:LinkTree):Promise<void> {
        return new Promise((resolve, reject) => {
            setDoc(FirestoreSettingsDatabase.NAVBAR_LINKS_DOC, newLinks)
            .then(resolve)
            .catch(reject);
        });
    }

}

class MissingSettingError extends Error {

    constructor(settingName:string) {
        super(`setting "${settingName}" not found in database.`);
    }

}