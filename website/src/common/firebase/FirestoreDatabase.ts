import { QueryConstraint, QueryDocumentSnapshot, QuerySnapshot, Timestamp, collection, documentId, endAt, endBefore, getCountFromServer, getDocs, getFirestore, limit, orderBy, query, startAfter, startAt, where } from "@firebase/firestore";
import Database, { ArticleDatabase, ArticleFilterOptions, ArticleInfo } from "../Database";
import FIREBASE_APP from "./init-firebase";
import { clamp } from "../NumberUtil";

// initialize Firebase Firestore
const DB = getFirestore(FIREBASE_APP);

/** An article as it appears in the database. */
type DBArticle = { index:number, heading:string, body:string, created_at:Timestamp, category:string };
/** Defines database interactions related to articles. */
class FirestoreArticleDatabase implements ArticleDatabase {

    /** Reference to the collection of articles. */
    private static readonly COLLECTION = collection(DB, "articles").withConverter({
        toFirestore(article:ArticleInfo):DBArticle {
            return {
                ...article,
                created_at: Timestamp.fromDate(article.created_at)
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

    public getRecent(limit=5, options?:Omit<ArticleFilterOptions, "limit"|"sortByIndex">) {
        return FirestoreArticleDatabase.getArticles({limit, sortByIndex:"descending", ...options});
    }

    public getByCategory(category:string, options?:Omit<ArticleFilterOptions, "id">) {
        return FirestoreArticleDatabase.getArticles({category, ...options});
    }

    public getCount(options?:ArticleFilterOptions) {
        return FirestoreArticleDatabase.getArticles({...options}, true);
    }

    public getNumBefore(before:Date, options?:Omit<ArticleFilterOptions, "before">):Promise<number> {
        return FirestoreArticleDatabase.getArticles({before, ...options}, true);
    }

    public getNumAfter(after:Date, options?:Omit<ArticleFilterOptions, "after">):Promise<number> {
        return FirestoreArticleDatabase.getArticles({after, ...options}, true);
    }

    private static getArticles(options:ArticleFilterOptions, doCount?:false):Promise<ArticleInfo[]>
    private static getArticles(options:ArticleFilterOptions, doCount?:true):Promise<number>
    private static getArticles(options:ArticleFilterOptions, doCount=false):Promise<ArticleInfo[]|number> {
        const constraints:QueryConstraint[] = []; // convert options into constraints
        // article-specific
        if (typeof options.endBefore === "number") constraints.push(endBefore(options.endBefore));
        if (options.sortByIndex) constraints.push(orderBy("index", options.sortByIndex === "ascending" ? "asc" : "desc"));
        if (options.before) constraints.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));
        // general
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));
        if (typeof options.startAt === "number") constraints.push(startAt(options.startAt));
        if (typeof options.startAfter === "number") constraints.push(startAfter(options.startAfter));
        if (typeof options.endAt === "number") constraints.push(endAt(options.endAt));        

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