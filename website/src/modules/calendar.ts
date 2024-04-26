import "./header-and-footer";
import "./create-split-view";

import EventCalendar from "../common/custom-elements/EventCalendar";
import FirestoreEventDatebase from "../common/firebase/database/events/FirestoreEventDatabase";
import Placeholder from "../common/custom-elements/Placeholder";
import Loading from "../common/Loading";
import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import FirestoreArticleDatabase from "../common/firebase/database/articles/FirestoreArticleDatabase";
import SmartArticle from "../common/custom-elements/SmartArticle";
import { DetailLevel } from "../common/util/UtilTypes";

const ARTICLE_ID = "Agenda";
const DB:ArticleDatabase = new FirestoreArticleDatabase();
Loading.useDynamicContent(DB.getById(ARTICLE_ID), articleInfo => { // load article
    if (!articleInfo) console.error(`article with ID "${ARTICLE_ID}" was now found`);
    else Placeholder.replaceWith("article", new SmartArticle(articleInfo, DetailLevel.FULL));
});

const EVENT_CALENDAR = new EventCalendar(new FirestoreEventDatebase(), new Date());

Loading.onDOMContentLoaded()
.then(() => {
    Placeholder.replaceWith("event-calendar", EVENT_CALENDAR);
});