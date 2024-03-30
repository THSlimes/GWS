import Loading from "../Loading";
import InfoList from "./InfoList";
import { IBSubmissionInfo } from "../firebase/database/idea-box-submissions/IBSubmissionDatabase";
import IBSubmissionPaginator from "../firebase/database/idea-box-submissions/IBSubmissionPaginator";
import ElementFactory from "../html-element-factory/ElementFactory";
import DateUtil from "../util/DateUtil";

export default class IBSubmissionList extends InfoList<IBSubmissionInfo> {

    constructor(paginator:IBSubmissionPaginator) {
        super(paginator, submission =>
            ElementFactory.div(undefined, "boxed", "flex-rows", "in-section-gap", "section-padding")
                .children(
                    ElementFactory.h2(submission.subject).class("subject", "no-margin"),
                    ElementFactory.p(submission.body).class("body", "section-padding", "no-margin")
                        .onMake(self => self.innerHTML = self.innerHTML.replaceAll('\n', "<br>")),
                    ElementFactory.div(undefined, "flex-columns", "cross-axis-baseline", "in-section-gap")
                        .children(
                            ElementFactory.p(`- ${typeof submission.author === "string" ? "Anoniem" : submission.author.name}`).class("italic"),
                            ElementFactory.p(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(submission.created_at))
                                .class("italic", "subtitle")
                                .style({ color: "var(--accent)" })
                        )
                )
                .make()
        );
    }

}

Loading.onDOMContentLoaded()
.then(() => customElements.define("idea-box-submission-list", IBSubmissionList));