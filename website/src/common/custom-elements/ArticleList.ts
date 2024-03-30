import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import { DetailLevel } from "../util/UtilTypes";
import SmartArticle from "./SmartArticle";
import Loading from "../Loading";
import InfoList from "./InfoList";
import { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";

export default class ArticleList extends InfoList<ArticleInfo> {

    constructor(paginator:ArticlePaginator, lod=DetailLevel.MEDIUM) {
        super(paginator, articleInfo => new SmartArticle(articleInfo, lod));

        this.setAttribute("lod", DetailLevel.toString(lod));
    }

}

Loading.onDOMContentLoaded()
.then(() => customElements.define("article-list", ArticleList));