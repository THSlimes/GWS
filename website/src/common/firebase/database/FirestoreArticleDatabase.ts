import { QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, documentId, getCountFromServer, getDocs, limit, orderBy, query, where } from "@firebase/firestore";
import { ArticleDatabase, ArticleFilterOptions, ArticleInfo } from "../../database-def";
import { clamp } from "../../NumberUtil";
import { PermissionGuarded } from "./Permission";
import { DB } from "../init-firebase";

/** An article as it appears in the database. */
type DBArticle = PermissionGuarded & {
    heading: string,
    body: string,
    created_at: Timestamp,
    category: string,
    show_on_homepage: boolean
};
/** Defines database interactions related to articles. */
export class FirestoreArticleDatabase extends ArticleDatabase {

    /** Reference to the collection of articles. */
    private static readonly COLLECTION = collection(DB, "articles").withConverter({
        toFirestore(article: ArticleInfo): DBArticle {
            return {
                ...article,
                created_at: Timestamp.fromDate(article.created_at),
                required_permissions: []
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DBArticle, ArticleInfo>): ArticleInfo {
            const data = snapshot.data();
            return {
                ...data,
                id: snapshot.id,
                created_at: data.created_at.toDate()
            };
        }
    });

    public get(limit = 5, options?: Omit<ArticleFilterOptions, "limit">) {
        return FirestoreArticleDatabase.getArticles({ limit, sortByCreatedAt: "descending", ...options });
    }

    public count(options?: ArticleFilterOptions) {
        return FirestoreArticleDatabase.getArticles({ ...options }, true);
    }

    public getById(id: string) {
        return new Promise<ArticleInfo | undefined>(async (resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ id })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined))
            .catch(reject);
        });
    }

    public getByCategory(category: string, options?: Omit<ArticleFilterOptions, "category">) {
        return FirestoreArticleDatabase.getArticles({ category, ...options });
    }

    public getNext(article: ArticleInfo, options?: Omit<ArticleFilterOptions, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return new Promise((resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ after: article.created_at, limit:1, sortByCreatedAt:"ascending", ...options })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined));
        });
    }

    public getPrevious(article: ArticleInfo, options?: Omit<ArticleFilterOptions, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return new Promise((resolve, reject) => {
            FirestoreArticleDatabase.getArticles({ before: article.created_at, limit:1, sortByCreatedAt:"descending", ...options })
            .then(articles => resolve(articles.length > 0 ? articles[0] : undefined));
        });
    }

    private static getArticles(options: ArticleFilterOptions, doCount?: false): Promise<ArticleInfo[]>;
    private static getArticles(options: ArticleFilterOptions, doCount?: true): Promise<number>;
    private static getArticles(options: ArticleFilterOptions, doCount = false): Promise<ArticleInfo[] | number> {
        const constraints: QueryConstraint[] = []; // convert options into constraints

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
                    const out: ArticleInfo[] = [];
                    snapshot.forEach(doc => out.push(doc.data()));
                    resolve(out);
                }
            }
            catch (e) { reject(e); }
        });

    }

}
