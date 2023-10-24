import { ArticleDatabase } from "../common/database-def";
import SmartArticle from "../common/custom-elements/SmartArticle";
import { FirestoreArticleDatabase } from "../common/firebase/database/FirestoreArticleDatabase";

const DB:ArticleDatabase = new FirestoreArticleDatabase();
const articleId = new URLSearchParams(window.location.search).get("id");
if (!articleId) window.location.replace("/"); // no article provided, go to homepage
else window.addEventListener("DOMContentLoaded", () => {
    const ARTICLE_DIV = document.getElementById("article")!;

    DB.getById(articleId)
    .then(article => {
        if (article) ARTICLE_DIV.appendChild(SmartArticle.fromInfo(article, false));
    })
    .catch(console.log); // TODO: insert error-message instead
});