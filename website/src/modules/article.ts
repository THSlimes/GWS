import "./header-and-footer";
import "./create-split-view";

import { ArticleDatabase } from "../common/firebase/database/database-def";
import SmartArticle from "../common/custom-elements/SmartArticle";
import { FirestoreArticleDatabase } from "../common/firebase/database/FirestoreArticleDatabase";
import RichText from "../common/ui/RichText";

/** Creates the link to an article given its ID. */
export function articleLink(id: string) { return `/article.html?id=${id}`; }

const DB:ArticleDatabase = new FirestoreArticleDatabase();
const articleId = new URLSearchParams(window.location.search).get("id");
if (!articleId) window.location.replace('/'); // no article provided, go to homepage
else window.addEventListener("DOMContentLoaded", () => {
    const ARTICLE_DIV = document.getElementById("article")!;
    const NEXT_ARTICLE_BUTTON = document.getElementById("next-article-button") as HTMLButtonElement;
    const PREV_ARTICLE_BUTTON = document.getElementById("prev-article-button") as HTMLButtonElement;

    DB.getById(articleId)
    .then(article => {
        if (article) {
            ARTICLE_DIV.prepend(SmartArticle.fromInfo(article, false));

            if (article.show_on_homepage) {
                DB.getNext(article, { forHomepage:true })
                .then(nextArticle => {
                    if (nextArticle) {
                        NEXT_ARTICLE_BUTTON.querySelector(".article-title")!.innerHTML = RichText.parseLine(nextArticle.heading);
                        NEXT_ARTICLE_BUTTON.addEventListener("click", () => location.href = articleLink(nextArticle.id));
                    }
                    else NEXT_ARTICLE_BUTTON.disabled = true;
                });
                DB.getPrevious(article, { forHomepage:true })
                .then(prevArticle => {
                    if (prevArticle) {
                        PREV_ARTICLE_BUTTON.querySelector(".article-title")!.innerHTML = RichText.parseLine(prevArticle.heading);
                        PREV_ARTICLE_BUTTON.addEventListener("click", () => location.href = articleLink(prevArticle.id));
                    }
                    else PREV_ARTICLE_BUTTON.disabled = true;
                });
            }
        }
        else window.location.replace('/'); // no such article found, go to homepage
    })
    .catch(console.log); // TODO: insert error-message instead
});