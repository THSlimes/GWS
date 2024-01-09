import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, doc, documentId, getCountFromServer, getDocs, limit, orderBy, query, where, writeBatch } from "@firebase/firestore";
import ArticleDatabase, { ArticleQueryFilter, ArticleInfo } from "./ArticleDatabase";
import { PermissionGuarded } from "../Permission";
import { DB } from "../../init-firebase";

/** An article as it appears in the database. */
type DBArticle = PermissionGuarded & {
    heading: string,
    body: string,
    created_at: Timestamp,
    category: string,
    show_on_homepage: boolean
};

const ARTICLE_CONVERTER:FirestoreDataConverter<ArticleInfo, DBArticle> = {
        toFirestore(article: ArticleInfo): DBArticle {
            return {
                ...article,
                created_at: Timestamp.fromDate(article.created_at)
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DBArticle, ArticleInfo>): ArticleInfo {
            const data = snapshot.data();
            
            return new ArticleInfo(
                snapshot.id,
                data.heading,
                data.body,
                data.created_at.toDate(),
                data.category,
                data.show_on_homepage
            );
        }
};

/** Defines database interactions related to articles. */
export class FirestoreArticleDatabase extends ArticleDatabase {

    /** Reference to the collection of articles. */
    private static readonly COLLECTION = collection(DB, "articles").withConverter(ARTICLE_CONVERTER);

    public get(options:ArticleQueryFilter = {}) {
        return FirestoreArticleDatabase.getArticles({ sortByCreatedAt: "descending", ...options });
    }

    public count(options:ArticleQueryFilter = {}) {
        return FirestoreArticleDatabase.getArticles({ ...options }, true);
    }

    public getById(id:string) {
        return new Promise<ArticleInfo | undefined>(async (resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ id })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined))
            .catch(reject);
        });
    }

    public getByCategory(category: string, options?: Omit<ArticleQueryFilter, "category">) {
        return FirestoreArticleDatabase.getArticles({ category, ...options });
    }

    public getNext(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return new Promise((resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ after: article.created_at, limit:1, sortByCreatedAt:"ascending", ...options })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined));
        });
    }

    public getPrevious(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return new Promise((resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ before: article.created_at, limit:1, sortByCreatedAt:"descending", ...options })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined));
        });
    }

    public write(...records: ArticleInfo[]): Promise<number> {
        return new Promise((resolve,reject) => {
            const batch = writeBatch(DB);
            for (const rec of records) batch.set(doc(DB, "articles", rec.id), ARTICLE_CONVERTER.toFirestore(rec));

            batch.commit()
            .then(() => resolve(records.length))
            .catch(reject);
        });
        
    }

    private static getArticles(options: ArticleQueryFilter, doCount?: false): Promise<ArticleInfo[]>;
    private static getArticles(options: ArticleQueryFilter, doCount?: true): Promise<number>;
    private static getArticles(options: ArticleQueryFilter, doCount = false): Promise<ArticleInfo[] | number> {
        const constraints: QueryConstraint[] = []; // convert options into constraints

        // general
        if (options.limit) constraints.push(limit(options.limit));
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
            if (doCount) {
                getCountFromServer(q)
                .then(res => resolve(res.data().count))
                .catch(reject);
            }
            else getDocs(q)
            .then(snapshot => {
                const out: ArticleInfo[] = [];
                snapshot.forEach(doc => out.push(doc.data()));
                resolve(out);
            })
            .catch(reject);
        });

    }

}
