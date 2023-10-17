import { DocumentData, Query, QueryConstraint, QuerySnapshot, Timestamp, collection, documentId, getDocs, getFirestore, limit, orderBy, query, where } from "@firebase/firestore";
import Database, { ArticleDatabase, ArticleQueryOptions, DBArticle } from "../Database";
import FIREBASE_APP from "./init-firebase";
import { clamp } from "../NumberUtil";

// initialize Firebase Firestore
const DB = getFirestore(FIREBASE_APP);

class FirestoreArticleDatabase implements ArticleDatabase {

    public byId(id: string) {
        return new Promise<DBArticle|undefined>(async (resolve, reject) => {
            const query = FirestoreArticleDatabase.createQuery({id:id});
            try {
                const snapshot = await getDocs(query); // execute query
                if (snapshot.empty) resolve(undefined);
                else resolve(FirestoreArticleDatabase.articlesFromSnapshot(snapshot)[0]);
            }
            catch (e) { reject(e); } // some error occurred
        });
    }

    public recent(limit=5, before=new Date(), options?:Omit<ArticleQueryOptions, "limit"|"before"|"createdAtSort">) {
        return new Promise<DBArticle[]>(async (resolve, reject) => {
            const query = FirestoreArticleDatabase.createQuery({limit, before, createdAtSort:"descending", ...options});
            try {
                const snapshot = await getDocs(query); // execute query                
                resolve(FirestoreArticleDatabase.articlesFromSnapshot(snapshot));
            }
            catch (e) { reject(e); } // some error occurred
        });
    }

    public byCategory(category:string, options?:Omit<ArticleQueryOptions, "id">) {
        return new Promise<DBArticle[]>(async (resolve, reject) => {
            const query = FirestoreArticleDatabase.createQuery({category, ...options});
            try {
                const snapshot = await getDocs(query); // execute query
                resolve(FirestoreArticleDatabase.articlesFromSnapshot(snapshot));
            }
            catch (e) { reject(e); } // some error occurred
        });
    }

    private static createQuery(options:ArticleQueryOptions):Query<DocumentData, DocumentData> {
        // convert options into constraints
        const constraints:QueryConstraint[] = [];
        if (options.limit) constraints.push(limit(clamp(options.limit, 0, 20)));
        if (options.createdAtSort) constraints.push(orderBy("created_at", options.createdAtSort === "ascending" ? "asc" : "desc"));
        if (options.before) constraints.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") constraints.push(where("category", "==", options.category));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        return query(collection(DB, "articles"), ...constraints);
    }
    private static articlesFromSnapshot(snapshot:QuerySnapshot<DocumentData, DocumentData>):DBArticle[] {
        const out:DBArticle[] = [];

        snapshot.forEach(doc => {
            out.push({id:doc.id, ...doc.data()} as DBArticle);
        });

        return out;
    }

}

export default class FirestoreDatabase implements Database {
    
    public readonly articles = new FirestoreArticleDatabase();

}