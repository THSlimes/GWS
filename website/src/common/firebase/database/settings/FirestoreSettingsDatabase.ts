import { QueryDocumentSnapshot, collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { FIRESTORE } from "../../init-firebase";
import SettingsDatabase, { ImagedLink, LinkTree } from "./SettingsDatabase";
import { AttachmentOrigin } from "../../../util/UtilTypes";

class FirestoreSettingsDatabase extends SettingsDatabase {

    private static COLLECTION = collection(FIRESTORE, "settings");


    private static NAVBAR_LINKS_DOC = doc(this.COLLECTION, "navbar-links")
        .withConverter({
            toFirestore(links:LinkTree):FirestoreSettingsDatabase.NavbarLinks {
                return { links: JSON.stringify(links) };
            },
            fromFirestore(snapshot:QueryDocumentSnapshot<FirestoreSettingsDatabase.NavbarLinks,LinkTree>):LinkTree {
                return JSON.parse(snapshot.data().links);
            }
        });

    override getNavbarLinks(defaultLink='/'): Promise<LinkTree> {
        return new Promise((resolve, reject) => {
            getDoc(FirestoreSettingsDatabase.NAVBAR_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) reject(new FirestoreSettingsDatabase.MissingDocError("navbar-links"));
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


    private SPONSOR_LINKS_DOC = doc(FirestoreSettingsDatabase.COLLECTION, "sponsor-links")
    .withConverter({
        toFirestore: FirestoreSettingsDatabase.ImagedLinks.to,
        fromFirestore: (snapshot) => FirestoreSettingsDatabase.ImagedLinks.from(snapshot.data())
    });

    override getSponsorLinks(): Promise<ImagedLink[]> {
        return new Promise((resolve, reject) => {
            getDoc(this.SPONSOR_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) reject(new FirestoreSettingsDatabase.MissingDocError("sponsor-links"));
                else resolve(docSnapshot.data());
            })
        });
    }

    override setSponsorLinks(links: ImagedLink[]):Promise<void> {
        return new Promise((resolve, reject) => {
            setDoc(this.SPONSOR_LINKS_DOC, links)
            .then(resolve)
            .catch(reject);
        });
    }


    private SOCIAL_MEDIA_LINKS_DOC = doc(FirestoreSettingsDatabase.COLLECTION, "social-media-links")
    .withConverter({
        toFirestore: FirestoreSettingsDatabase.ImagedLinks.to,
        fromFirestore: (snapshot) => FirestoreSettingsDatabase.ImagedLinks.from(snapshot.data())
    });

    override getSocialMediaLinks(): Promise<ImagedLink[]> {
        return new Promise((resolve, reject) => {
            getDoc(this.SOCIAL_MEDIA_LINKS_DOC)
            .then(docSnapshot => {
                if (!docSnapshot.exists()) reject(new FirestoreSettingsDatabase.MissingDocError("social-media-links"));
                else resolve(docSnapshot.data());
            })
        });
    }

    override setSocialMediaLinks(links: ImagedLink[]):Promise<void> {
        return new Promise((resolve, reject) => {
            setDoc(this.SOCIAL_MEDIA_LINKS_DOC, links)
            .then(resolve)
            .catch(reject);
        });
    }

}

namespace FirestoreSettingsDatabase {

    export type NavbarLinks = { links: string };

    export type ImagedLinks = {[name:string]: { origin:AttachmentOrigin, src:string, href:string }};
    export namespace ImagedLinks {
        export function from(dbLinks:ImagedLinks):ImagedLink[] {
            const out:ImagedLink[] = [];
            for (const name in dbLinks) {
                out.push({ name, ...dbLinks[name] });
            }
            return out;
        }

        export function to(links:ImagedLink[]):ImagedLinks {
            const out:ImagedLinks = {};
            for (const link of links) out[link.name] = { origin: link.origin, src: link.src, href: link.href };
            return out;
        }
    }

    export class MissingDocError extends Error {

        constructor(settingName:string) {
            super(`setting "${settingName}" not found in database (missing document).`);
        }

    }

}

export default FirestoreSettingsDatabase;