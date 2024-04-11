import IBSubmissionList from "../custom-elements/IBSubmissionList";
import Placeholder from "../custom-elements/Placeholder";
import FirestoreIBSubmissionDatabase from "../firebase/database/idea-box-submissions/FirestoreIBSubmissionDatabase";
import IBSubmissionPaginator from "../firebase/database/idea-box-submissions/IBSubmissionPaginator";
import Loading from "../Loading";

const DB = new FirestoreIBSubmissionDatabase();
/** paginator for submissions */
const PAGINATOR = new IBSubmissionPaginator(DB, {}, 10);

let initializedIdeaBoxPanel = false;
/** Initializes the panel for idea box submissions. */
export function initIdeaBoxPanel() {
    if (!initializedIdeaBoxPanel) {
        Loading.markLoadStart(initIdeaBoxPanel);

        Placeholder.replaceWith("idea-box-submissions-list", new IBSubmissionList(PAGINATOR));
        initializedIdeaBoxPanel = true;

        Loading.markLoadEnd(initIdeaBoxPanel);
    }
}