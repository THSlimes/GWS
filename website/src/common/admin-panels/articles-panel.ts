import ArticleList from "../custom-elements/ArticleList";
import Placeholder from "../custom-elements/Placeholder";
import SmartArticle, { EditableSmartArticle } from "../custom-elements/SmartArticle";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import { FirestoreArticleDatabase } from "../firebase/database/articles/FirestoreArticleDatabase";

let articlesPanelInitialized = false;

const DB = new FirestoreArticleDatabase();
const PAGE_SIZE = 8;

const NEW_ARTICLE_INFO = new ArticleInfo(DB, "", "", "", new Date(), "", true, false);

export function initArticlesPanel() {
    if (!articlesPanelInitialized) {
        checkPermissions(Permission.READ_MEMBER_ARTICLES, hasPerms => { // list of recent articles
            Placeholder.replaceWith("article-list", new ArticleList(new ArticlePaginator(DB, PAGE_SIZE, { forMembers: hasPerms ? undefined : false }), 'low'));
        }, false);

        const NEW_ARTICLE = new EditableSmartArticle(NEW_ARTICLE_INFO, "full", true);
        NEW_ARTICLE.onSave = newArticle => location.href = SmartArticle.getLinkTo(newArticle);
        Placeholder.replaceWith("new-article", NEW_ARTICLE);

        articlesPanelInitialized = true;
    }
}