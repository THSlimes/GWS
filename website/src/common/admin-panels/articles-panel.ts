import ArticleList from "../custom-elements/ArticleList";
import Placeholder from "../custom-elements/Placeholder";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import { FirestoreArticleDatabase } from "../firebase/database/articles/FirestoreArticleDatabase";

let articlesPanelInitialized = false;

const DB = new FirestoreArticleDatabase();
const PAGE_SIZE = 8;

export function initArticlesPanel() {
    if (!articlesPanelInitialized) {
        checkPermissions(Permission.READ_MEMBER_ARTICLES, hasPerms => {
            Placeholder.replaceWith("article-list", new ArticleList(new ArticlePaginator(DB, PAGE_SIZE, { forMembers: hasPerms ? undefined : false }), 'low'));
        }, false);

        articlesPanelInitialized = true;
    }
}