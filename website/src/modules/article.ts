import "./header-and-footer";
import "./create-split-view";

import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import SmartArticle, { EditableSmartArticle } from "../common/custom-elements/SmartArticle";
import { FirestoreArticleDatabase } from "../common/firebase/database/articles/FirestoreArticleDatabase";
import { runOnErrorCode } from "../common/firebase/authentication/error-messages";
import URLUtil from "../common/util/URLUtil";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Loading from "../common/Loading";

/** Creates the link to an article given its ID. */
export function articleLink(id: string) { return `/article.html?id=${id}`; }

const DB:ArticleDatabase = new FirestoreArticleDatabase();
const urlSearchParams = new URLSearchParams(window.location.search);
const articleId = urlSearchParams.get("id");
const isEditMode = urlSearchParams.get("mode") === "edit";
if (!articleId) window.location.replace('/'); // no article provided, go to homepage
else window.addEventListener("DOMContentLoaded", () => {
    const ARTICLE_DIV = document.getElementById("article")!;
    const NAVIGATION_BUTTONS_DIV = document.getElementById("navigation-buttons")!;

    Loading.markLoadStart(window);
    DB.getById(articleId)
    .then(articleInfo => {
        if (articleInfo) {
            const article = isEditMode ? new EditableSmartArticle(articleInfo, "full") : new SmartArticle(articleInfo, "full");
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
        else window.location.replace('/'); // no such article found, go to homepage
    })
    .catch(runOnErrorCode("permission-denied", () => location.replace(URLUtil.createLinkBackURL("/login.html", location.href))))
    .finally(() => Loading.markLoadEnd(window));
});