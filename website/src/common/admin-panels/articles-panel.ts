import Loading from "../Loading";
import ArticleList from "../custom-elements/ArticleList";
import Placeholder from "../custom-elements/Placeholder";
import SmartArticle, { EditableSmartArticle } from "../custom-elements/SmartArticle";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import FirestoreArticleDatabase from "../firebase/database/articles/FirestoreArticleDatabase";
import { DetailLevel } from "../util/UtilTypes";

let articlesPanelInitialized = false;

const DB = new FirestoreArticleDatabase();
const PAGE_SIZE = 8; // number of articles in page of overview

const NEW_ARTICLE_INFO = new ArticleInfo(DB, "", "", "", new Date(), "", true, false); // placeholder info for new articles

/** Initialized the articles panel. */
export function initArticlesPanel() {
    if (!articlesPanelInitialized) {
        Loading.markLoadStart(initArticlesPanel);

        // query appropriate articles based on permissions
        checkPermissions(Permissions.Permission.READ_MEMBER_ARTICLES, false)
        .then(hasPerms => { // list of recent articles
            const baseFilter = { forMembers: hasPerms.READ_MEMBER_ARTICLES ? undefined : false };
            Placeholder.replaceWith("article-list", new ArticleList(new ArticlePaginator(DB, baseFilter, PAGE_SIZE), DetailLevel.LOW));
        });


        // new article editor (just an editable article)
        const NEW_ARTICLE = new EditableSmartArticle(NEW_ARTICLE_INFO, DetailLevel.FULL, true);
        NEW_ARTICLE.id = "new-article";
        NEW_ARTICLE.onSave = newArticle => location.href = SmartArticle.getLinkTo(newArticle);
        Placeholder.replaceWith("new-article", NEW_ARTICLE);

        articlesPanelInitialized = true;

        Loading.markLoadEnd(initArticlesPanel);
    }
}