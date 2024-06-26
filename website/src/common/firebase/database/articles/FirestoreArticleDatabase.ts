import { FirestoreDataConverter, QueryConstraint, QueryDocumentSnapshot, Timestamp, collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, orderBy, query, where, writeBatch } from "@firebase/firestore";
import ArticleDatabase, { ArticleQueryFilter, ArticleInfo } from "./ArticleDatabase";
import { FIRESTORE } from "../../init-firebase";

function getArticleConverter(db:ArticleDatabase):FirestoreDataConverter<ArticleInfo, FirestoreArticleDatabase.Article> {
    return {
        toFirestore(article: ArticleInfo): FirestoreArticleDatabase.Article {
            return {
                heading: article.heading,
                body: article.body,
                category: article.category,
                created_at: Timestamp.fromDate(article.created_at),
                show_on_homepage: article.show_on_homepage,
                only_for_members: article.only_for_members
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreArticleDatabase.Article, ArticleInfo>): ArticleInfo {
            const data = snapshot.data();
            
            return new ArticleInfo(
                db,
                snapshot.id,
                data.heading,
                data.body,
                data.created_at.toDate(),
                data.category,
                data.show_on_homepage,
                data.only_for_members
            );
        }
    };
}

/** Defines database interactions related to articles. */
class FirestoreArticleDatabase extends ArticleDatabase {

    private readonly converter = getArticleConverter(this);
    /** Reference to the collection of articles. */
    private readonly COLLECTION = collection(FIRESTORE, "articles").withConverter(this.converter);

    public get(options:ArticleQueryFilter = {}) {
        return this.getArticles({ sortByCreatedAt: "descending", ...options });
    }

    public count(options:ArticleQueryFilter = {}) {
        return this.getArticles({ ...options }, true);
    }

    public getById(id:string) {
        
        const docRef = doc(this.COLLECTION, id);
        return getDoc(docRef)
            .then(snapshot => snapshot.exists() ? snapshot.data() : undefined);
    }

    public getByCategory(category: string, options?: Omit<ArticleQueryFilter, "category">) {
        return this.getArticles({ category, ...options });
    }

    public getNext(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return this.getArticles({ after: article.created_at, limit:1, sortByCreatedAt:"ascending", ...options })
            .then(articles => articles.length > 0 ? articles[0] : undefined);
    }

    public getPrevious(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit"|"before"|"after"|"sortByCreatedAt"> | undefined): Promise<ArticleInfo|undefined> {
        return this.getArticles({ before: article.created_at, limit:1, sortByCreatedAt:"descending", ...options })
            .then(articles => articles.length > 0 ? articles[0] : undefined);
    }

    public doWrite(...records: ArticleInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) batch.set(doc(FIRESTORE, "articles", rec.id), this.converter.toFirestore(rec));
        return batch.commit().then(() => records.length);
    }

    public doDelete(...records:ArticleInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) batch.delete(doc(FIRESTORE, "articles", rec.id));
        return batch.commit().then(() => records.length);
    }

    private getArticles(options: ArticleQueryFilter, doCount?: false): Promise<ArticleInfo[]>;
    private getArticles(options: ArticleQueryFilter, doCount?: true): Promise<number>;
    private getArticles(options: ArticleQueryFilter, doCount = false): Promise<ArticleInfo[] | number> {
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
        if (options.forHomepage !== undefined) constraints.push(where("show_on_homepage", "==", options.forHomepage));
        if (options.forMembers !== undefined) constraints.push(where("only_for_members", "==", options.forMembers));

        const q = query(this.COLLECTION, ...constraints); // create query
        return doCount ?
            getCountFromServer(q)
            .then(res => res.data().count) :
            getDocs(q)
            .then(snapshot => {
                const out: ArticleInfo[] = [];
                snapshot.forEach(doc => out.push(doc.data()));
                return out;
            });
    }

}

namespace FirestoreArticleDatabase {
    /** An article as it appears in the database. */
    export type Article = {
        heading: string,
        body: string,
        created_at: Timestamp,
        category: string,
        show_on_homepage: boolean,
        only_for_members: boolean
    };
}

export default FirestoreArticleDatabase;