import "./header-and-footer";
import "./create-split-view";

import "../common/ui/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";
import "../common/custom-elements/ArticleList";

import { ArticleQueryFilter } from "../common/firebase/database/articles/ArticleDatabase";
import { FirestoreArticleDatabase } from "../common/firebase/database/articles/FirestoreArticleDatabase";
import Placeholder from "../common/custom-elements/Placeholder";
import ArticlePaginator from "../common/firebase/database/articles/ArticlePaginator";
import { checkPermissions } from "../common/firebase/authentication/permission-based-redirect";
import Permissions from "../common/firebase/database/Permissions";
import ArticleList from "../common/custom-elements/ArticleList";
import Loading from "../common/Loading";
import makePhotoCarousel from "../common/ui/photo-carousel";

Loading.useDynamicContent(makePhotoCarousel("Studievereniging Den Geitenwollen Soc."), carousel => {
    Placeholder.replaceWith("photo-carousel", carousel);
});


// list of recent articles
const DB = new FirestoreArticleDatabase();
const PAGE_SIZE = 5;

Loading.useDynamicContent(checkPermissions(Permissions.Permission.READ_MEMBER_ARTICLES, true), res => {
    const baseFilter:ArticleQueryFilter = { forHomepage: true, forMembers: res[Permissions.Permission.READ_MEMBER_ARTICLES] ? undefined : false };
    Placeholder.replaceWith("article-list", new ArticleList(new ArticlePaginator(DB, PAGE_SIZE, baseFilter)));
});