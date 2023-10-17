import { DocumentData, QueryConstraint, QuerySnapshot, Timestamp, collection, documentId, getDocs, getFirestore, limit, orderBy, query, where } from "@firebase/firestore";
import Database, { ArticleDatabase, ArticleQueryOptions, DBArticle } from "../Database";
import FIREBASE_APP from "./init-firebase";

// initialize Firebase Firestore
const DB = getFirestore(FIREBASE_APP);

export default class FirestoreDatabase implements Database {

    private static createArticleQueryConstraints(options:ArticleQueryOptions):QueryConstraint[] {
        const out:QueryConstraint[] = [];

        if (options.limit && options.limit >= 1) out.push(limit(options.limit));
        if (options.createdAtSort) out.push(orderBy("created_at", options.createdAtSort === "ascending" ? "asc" : "desc"));
        if (options.before) out.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) out.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (typeof options.category === "string") out.push(where("category", "==", options.category));
        if (options.isNot) out.push(where(documentId(), "!=", options.isNot));

        return out;
    }
    private static articlesFromSnapshot(snapshot:QuerySnapshot<DocumentData, DocumentData>):DBArticle[] {
        const out:DBArticle[] = [];

        snapshot.forEach(doc => {
            out.push({id:doc.id, ...doc.data()} as DBArticle);
        });

        return out;
    }
    
    articles: ArticleDatabase = {
        byId(id, options={limit:1}) {
            throw new Error();
        },

        recent(limit=5, before=new Date(), options:Omit<ArticleQueryOptions, "limit"|"before"|"createdAtSort">) {

            return new Promise(async (resolve, reject) => {
                const q = query( // build database query
                    collection(DB, "articles"),
                    ...FirestoreDatabase.createArticleQueryConstraints({limit, before, createdAtSort:"descending", ...options})
                );

                // execute query
                try {
                    const snapshot = await getDocs(q); // execute query
                    console.log(snapshot.size);
                    
                    resolve(FirestoreDatabase.articlesFromSnapshot(snapshot));
                }
                catch (e) { reject(e); }
            });

        },

        byCategory(category, options={category}) {
            throw new Error();
            
        },
    }

}