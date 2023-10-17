import SmartArticle from "../common/custom-elements/SmartArticle";
import FirestoreDatabase from "../common/firebase/FirestoreDatabase";

const ARTICLE_DIV = document.getElementById("article")!;

const DB = new FirestoreDatabase();

const articleId = new URLSearchParams(window.location.search).get("id");

if (articleId) {
    DB.articles.byId(articleId)
    .then(article => {
        if (article) ARTICLE_DIV.appendChild(SmartArticle.fromInfo(article, false));
    })
    .catch(console.log)
}
else window.location.replace("/");
