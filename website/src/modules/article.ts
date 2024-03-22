import "./header-and-footer";
import "./create-split-view";

import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import SmartArticle, { EditableSmartArticle } from "../common/custom-elements/SmartArticle";
import FirestoreArticleDatabase from "../common/firebase/database/articles/FirestoreArticleDatabase";
import { runOnErrorCode } from "../common/firebase/authentication/error-messages";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Loading from "../common/Loading";
import UserFeedback from "../common/ui/UserFeedback";
import { DetailLevel } from "../common/util/UtilTypes";
import { checkPermissions } from "../common/firebase/authentication/permission-based-redirect";
import Permissions from "../common/firebase/database/Permissions";
import URLUtil from "../common/util/URLUtil";

/** Creates the link to an article given its ID. */
export function articleLink(id: string) { return `/article.html?id=${id}`; }

const DB:ArticleDatabase = new FirestoreArticleDatabase();
const urlSearchParams = new URLSearchParams(window.location.search);
const articleId = urlSearchParams.get("id");
const isEditMode = urlSearchParams.get("mode") === "edit";

if (!articleId) window.location.replace('/'); // no article provided, go to homepage
else Loading.useDynamicContent(Promise.all([DB.getById(articleId), checkPermissions(Permissions.Permission.UPDATE_ARTICLES)]), ([articleInfo, permRes]) => {
    
    const canUpdate = permRes.UPDATE_ARTICLES;

    if (articleInfo) {
        const ARTICLE_DIV = document.getElementById("article")!;
        const NAVIGATION_BUTTONS_DIV = document.getElementById("navigation-buttons")!;

        const article = isEditMode && canUpdate ?
            new EditableSmartArticle(articleInfo, DetailLevel.FULL) :
            new SmartArticle(articleInfo, DetailLevel.FULL);
        ARTICLE_DIV.prepend(article);

        if (articleInfo.show_on_homepage) {
            DB.getNext(articleInfo, { forHomepage:true, forMembers:false })
            .then(nextArticle => {
                if (nextArticle) NAVIGATION_BUTTONS_DIV.appendChild(
                    ElementFactory.button(() => location.href = articleLink(nextArticle.id))
                        .class("flex-columns", "main-axis-space-between", "cross-axis-center", "text-right")
                        .children(
                            ElementFactory.p("chevron_left").class("icon"),
                            ElementFactory.p(nextArticle.heading)
                        )
                        .make()
                )
            });
            DB.getPrevious(articleInfo, { forHomepage:true, forMembers:false })
            .then(prevArticle => {
                if (prevArticle) NAVIGATION_BUTTONS_DIV.appendChild(
                    ElementFactory.button(() => location.href = articleLink(prevArticle.id))
                        .class("flex-columns", "main-axis-space-between", "cross-axis-center", "text-left")
                        .children(
                            ElementFactory.p(prevArticle.heading),
                            ElementFactory.p("chevron_right").class("icon")
                        )
                        .make()
                )
            });
        }
    }
    else {
        UserFeedback.relayError("We konden dat bericht niet vinden. Mogelijk klopt de link niet?");
        window.location.replace('/'); // no such article found, go to homepage
    }
    
}, runOnErrorCode("permission-denied", () => {
    UserFeedback.relayError("Dat bericht is alleen zichtbaar voor leden.");
    location.replace(URLUtil.createLinkBackURL("/login.html", location.href));
}));