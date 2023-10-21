import { QueryConstraint, QueryDocumentSnapshot, QuerySnapshot, Timestamp, collection, documentId, endAt, endBefore, getCountFromServer, getDocs, getFirestore, limit, orderBy, query, startAfter, startAt, where } from "@firebase/firestore";
import Database, { ArticleDatabase, ArticleFilterOptions, ArticleInfo } from "../Database";
import FIREBASE_APP from "./init-firebase";
import { clamp } from "../NumberUtil";

// initialize Firebase Firestore
const DB = getFirestore(FIREBASE_APP);

enum Permission {
    HAS_ACCOUNT = "HAS_ACCOUNT",
    READ_MEMBER_ARTICLES = "READ_MEMBER_ARTICLES"
}
type PermissionGuarded = { required_permissions: Permission[] };

/** An article as it appears in the database. */
type DBArticle = PermissionGuarded & { heading:string, body:string, created_at:Timestamp, category:string, show_on_homepage:boolean };
/** Defines database interactions related to articles. */
class FirestoreArticleDatabase implements ArticleDatabase {

    /** Reference to the collection of articles. */
    private static readonly COLLECTION = collection(DB, "articles").withConverter({
        toFirestore(article:ArticleInfo):DBArticle {
            return {
                ...article,
                created_at: Timestamp.fromDate(article.created_at),
                required_permissions: []
            }
        },
        fromFirestore(snapshot:QueryDocumentSnapshot<DBArticle, ArticleInfo>):ArticleInfo {
            const data = snapshot.data();
            return {
                ...data,
                id: snapshot.id,
                created_at: data.created_at.toDate()
            };
        }
    });

    public getById(id: string) {
        return new Promise<ArticleInfo|undefined>(async (resolve, reject) => {
            FirestoreArticleDatabase.getArticles({id})
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined))
            .catch(reject);
        });
    }

    public get(limit=5, options?:Omit<ArticleFilterOptions, "limit">) {
        return FirestoreArticleDatabase.getArticles({limit, sortByCreatedAt:"descending", ...options});
    }

    public getByCategory(category:string, options?:Omit<ArticleFilterOptions, "id">) {
        return FirestoreArticleDatabase.getArticles({category, ...options});
    }

    public getCount(options?:ArticleFilterOptions) {
        return FirestoreArticleDatabase.getArticles({...options}, true);
    }

    private static getArticles(options:ArticleFilterOptions, doCount?:false):Promise<ArticleInfo[]>
    private static getArticles(options:ArticleFilterOptions, doCount?:true):Promise<number>
    private static getArticles(options:ArticleFilterOptions, doCount=false):Promise<ArticleInfo[]|number> {
        const constraints:QueryConstraint[] = []; // convert options into constraints
        // general
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        // article-specific
        if (options.sortByCreatedAt) constraints.push(orderBy("created_at", options.sortByCreatedAt === "ascending" ? "asc" : "desc"));
        if (options.before) constraints.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));
        if (options.forHomepage) constraints.push(where("show_on_homepage", "==", true));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreArticleDatabase.COLLECTION, ...constraints); // create query
            try {
                if (doCount) resolve((await getCountFromServer(q)).data().count); // get count
                else { // get documents
                    const snapshot = await getDocs(q);
                    const out:ArticleInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    resolve(out);
                }
            }
            catch (e) { reject(e); }
        });

    }

}

export default class FirestoreDatabase implements Database {
    
    public readonly articles = new FirestoreArticleDatabase();

}