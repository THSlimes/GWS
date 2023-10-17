import { DocumentData, Query, QueryConstraint, QueryDocumentSnapshot, QuerySnapshot, Timestamp, collection, documentId, getDocs, getFirestore, limit, orderBy, query, where } from "@firebase/firestore";
import Database, { ArticleDatabase, ArticleFilterOptions, ArticleInfo } from "../Database";
import FIREBASE_APP from "./init-firebase";
import { clamp } from "../NumberUtil";

// initialize Firebase Firestore
const DB = getFirestore(FIREBASE_APP);

/** An article as it appears in the database. */
type DBArticle = { heading:string, body:string, created_at:Timestamp, category:string };
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

    public byId(id: string) {
        return new Promise<ArticleInfo|undefined>(async (resolve, reject) => {
            FirestoreArticleDatabase.getArticles({id})
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined))
            .catch(reject);
        });
    }

    public recent(limit=5, options?:Omit<ArticleFilterOptions, "limit"|"createdAtSort">) {
        return FirestoreArticleDatabase.getArticles({limit, createdAtSort:"descending", ...options});
    }

    public byCategory(category:string, options?:Omit<ArticleFilterOptions, "id">) {
        return FirestoreArticleDatabase.getArticles({category, ...options});
    }

    private static getArticles(options:ArticleFilterOptions):Promise<ArticleInfo[]> {
        // convert options into constraints
        const constraints:QueryConstraint[] = [];
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.createdAtSort) constraints.push(orderBy("created_at", options.createdAtSort === "ascending" ? "asc" : "desc"));
        if (options.before) constraints.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        return new Promise(async (resolve, reject) => {
            const q = query(FirestoreArticleDatabase.COLLECTION, ...constraints); // create query
            try {
                const snapshot = await getDocs(q);
                const out:ArticleInfo[] = [];
                snapshot.forEach(doc => out.push(doc.data()));
                resolve(out);
            }
            catch (e) { reject(e); }
        });

    }

}

export default class FirestoreDatabase implements Database {
    
    public readonly articles = new FirestoreArticleDatabase();

}