import Loading from "../Loading";
import ArticleList from "../custom-elements/ArticleList";
import Placeholder from "../custom-elements/Placeholder";
import SmartArticle, { EditableSmartArticle } from "../custom-elements/SmartArticle";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import { FirestoreArticleDatabase } from "../firebase/database/articles/FirestoreArticleDatabase";

let articlesPanelInitialized = false;

const DB = new FirestoreArticleDatabase();
const PAGE_SIZE = 8;

const NEW_ARTICLE_INFO = new ArticleInfo(DB, "", "", "", new Date(), "", true, false);

export function initArticlesPanel() {
    if (!articlesPanelInitialized) {
        Loading.markLoadStart(initArticlesPanel);

        checkPermissions(Permissions.Permission.READ_MEMBER_ARTICLES, false)
        .then(hasPerms => { // list of recent articles
            const baseFilter = { forMembers: hasPerms.READ_MEMBER_ARTICLES ? undefined : false };
            Placeholder.replaceWith("article-list", new ArticleList(new ArticlePaginator(DB, PAGE_SIZE, baseFilter), 'low'));
        });

        const NEW_ARTICLE = new EditableSmartArticle(NEW_ARTICLE_INFO, "full", true);
        NEW_ARTICLE.id = "new-article";
        NEW_ARTICLE.onSave = newArticle => location.href = SmartArticle.getLinkTo(newArticle);
        Placeholder.replaceWith("new-article", NEW_ARTICLE);

        articlesPanelInitialized = true;

        Loading.markLoadEnd(initArticlesPanel);
    }
}