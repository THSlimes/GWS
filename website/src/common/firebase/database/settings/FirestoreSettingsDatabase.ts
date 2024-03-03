import { QueryDocumentSnapshot, collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { FIRESTORE } from "../../init-firebase";
import SettingsDatabase, { ImagedLink, LinkTree } from "./SettingsDatabase";
import { AttachmentOrigin } from "../../../custom-elements/MultisourceAttachment";


type DBNavbarLinks = { links: string };

type DBImagedLinks = {[name:string]: { origin:AttachmentOrigin, src:string, href:string }};
namespace DBImagedLinks {
    export function from(dbLinks:DBImagedLinks):ImagedLink[] {
        const out:ImagedLink[] = [];
        for (const name in dbLinks) {
            out.push({ name, ...dbLinks[name] });
        }
        return out;
    }

    export function to(links:ImagedLink[]):DBImagedLinks {
        const out:DBImagedLinks = {};
        for (const link of links) out[link.name] = { origin: link.origin, src: link.src, href: link.href };
        return out;
    }
}

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
                if (!docSnapshot.exists()) reject(new MissingSettingError("navbar-links"));
                else resolve(docSnapshot.data());
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


    private static SPONSOR_LINKS_DOC = doc(this.COLLECTION, "sponsor-links")
    .withConverter({
        toFirestore: DBImagedLinks.to,
        fromFirestore: (snapshot) => DBImagedLinks.from(snapshot.data())
    });

    override getSponsorLinks(): Promise<ImagedLink[]> {
        return new Promise((resolve, reject) => {
            getDoc(FirestoreSettingsDatabase.SPONSOR_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) reject(new MissingSettingError("sponsor-links"));
                else resolve(docSnapshot.data());
            })
        });
    }

    override setSponsorLinks(links: ImagedLink[]):Promise<void> {
        return new Promise((resolve, reject) => {
            setDoc(FirestoreSettingsDatabase.SPONSOR_LINKS_DOC, links)
            .then(resolve)
            .catch(reject);
        });
    }


    private static SOCIAL_MEDIA_LINKS_DOC = doc(this.COLLECTION, "social-media-links")
    .withConverter({
        toFirestore: DBImagedLinks.to,
        fromFirestore: (snapshot) => DBImagedLinks.from(snapshot.data())
    });

    override getSocialMediaLinks(): Promise<ImagedLink[]> {
        return new Promise((resolve, reject) => {
            getDoc(FirestoreSettingsDatabase.SOCIAL_MEDIA_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) reject(new MissingSettingError("social-media-links"));
                else resolve(docSnapshot.data());
            })
        });
    }

    override setSocialMediaLinks(links: ImagedLink[]):Promise<void> {
        return new Promise((resolve, reject) => {
            setDoc(FirestoreSettingsDatabase.SOCIAL_MEDIA_LINKS_DOC, links)
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