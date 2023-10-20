import SmartArticle from "../common/custom-elements/SmartArticle";
import FirestoreDatabase from "../common/firebase/FirestoreDatabase";

const DB = new FirestoreDatabase();
const articleId = new URLSearchParams(window.location.search).get("id");
if (!articleId) window.location.replace("/"); // no article provided, go to homepage
else window.addEventListener("DOMContentLoaded", () => {
    const ARTICLE_DIV = document.getElementById("article")!;

    DB.articles.getById(articleId)
    .then(article => {
        if (article) ARTICLE_DIV.appendChild(SmartArticle.fromInfo(article, false));
    })
    .catch(console.log); // TODO: insert error-message instead
});