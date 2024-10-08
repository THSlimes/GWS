import Loading from "../common/Loading"
import SmartArticle from "../common/custom-elements/SmartArticle";
import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import FirestoreArticleDatabase from "../common/firebase/database/articles/FirestoreArticleDatabase";

import "./header-and-footer";
import "./create-split-view";
import Placeholder from "../common/custom-elements/Placeholder";
import "../common/custom-elements/Switch";


import { DetailLevel } from "../common/util/UtilTypes";
import RegistrationForm from "../common/custom-elements/RegistrationForm";

// loading associated article
const ARTICLE_ID = "Inschrijven-Den-Geitenwollen-Soc";
const DB: ArticleDatabase = new FirestoreArticleDatabase();
Loading.useDynamicContent(DB.getById(ARTICLE_ID), articleInfo => { // load article
    if (!articleInfo) console.error(`article with ID "${ARTICLE_ID}" was now found`);
    else Placeholder.replaceWith("article", new SmartArticle(articleInfo, DetailLevel.FULL));
});


Loading.onDOMContentLoaded()
    .then(() => Placeholder.replaceWith("form", new RegistrationForm(true)));