import "../common/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";

import FirestoreDatabase from "../common/firebase/FirestoreDatabase";
import SmartArticle from "../common/custom-elements/SmartArticle";

const RECENT_MESSAGES_ELEM = document.getElementById("recent-messages")!;

const DB = new FirestoreDatabase();

DB.articles.recent(5)
.then(articles => {
    RECENT_MESSAGES_ELEM.append(...articles.map(a => SmartArticle.fromDB(a, true)));
})