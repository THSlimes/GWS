import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions, onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import FirestoreIBSubmissionDatabase from "../firebase/database/idea-box-submissions/FirestoreIBSubmissionDatabase";
import IBSubmissionDatabase, { IBSubmissionInfo } from "../firebase/database/idea-box-submissions/IBSubmissionDatabase";
import Permissions from "../firebase/database/Permissions";
import FirestoreUserDatabase from "../firebase/database/users/FirestoreUserDatabase";
import UserDatabase from "../firebase/database/users/UserDatabase";
import { onAuth } from "../firebase/init-firebase";
import ElementFactory from "../html-element-factory/ElementFactory";
import UserFeedback from "../ui/UserFeedback";
import StringUtil from "../util/StringUtil";
import URLUtil from "../util/URLUtil";
import { HasSections } from "../util/UtilTypes";
import Switch from "./Switch";

export default class IdeaBox extends HTMLElement implements HasSections<"anonymousSwitch"|"subjectInput"|"bodyInput"|"submitButton"|"feedbackText"> {

    private static SUBMISSION_DB:IBSubmissionDatabase = new FirestoreIBSubmissionDatabase();
    private static USER_DB:UserDatabase = new FirestoreUserDatabase();

    public anonymousSwitch!:Switch;
    public subjectInput!:HTMLInputElement;
    public bodyInput!:HTMLTextAreaElement;
    public submitButton!:HTMLButtonElement;
    public feedbackText!:HTMLDivElement;

    constructor() {
        super();

        this.initElement();
    }

    initElement(): void {
        this.classList.add("boxed", "flex-rows", "center-content", "in-section-gap");

        this.appendChild(
            ElementFactory.div(undefined, "flex-columns", "main-axis-space-between", "cross-axis-center", "min-section-gap")
                .children(
                    ElementFactory.p("Anonieme suggestie?").class("italic", "no-margin"),
                    this.anonymousSwitch = new Switch(false)
                )
                .make()
        );
        this.anonymousSwitch.addEventListener("input", () => this.feedbackText.lastElementChild!.toggleAttribute("hidden", this.anonymousSwitch.value));

        this.subjectInput = this.appendChild(
            ElementFactory.input.text()
                .class("subject-input")
                .attr("invalid")
                .placeholder("Onderwerp...")
                .maxLength(128)
                .make()
        );

        this.bodyInput = this.appendChild(
            ElementFactory.textarea()
                .class("message-input")
                .attr("invalid")
                .placeholder("Bericht...")
                .maxLength(5096)
                .attr("no-resize")
                .make()
        );

        this.submitButton = this.appendChild(
            ElementFactory.button()
                .class("flex-columns", "cross-axis-center", "in-section-gap")
                .attr("disabled")
                .children(
                    ElementFactory.h4("Versturen"),
                    ElementFactory.h4("send").class("icon")
                )
                .make()
        );

        this.feedbackText = this.appendChild(
            ElementFactory.div(undefined, "feedback", "flex-rows", "center-content", "in-section-gap", "section-padding")
                .attr("hidden")
                .children(
                    ElementFactory.h4("Bedankt voor je suggestie!").class('no-margin'),
                    ElementFactory.h4("We zullen z.s.m. contact met je opnemen.").class("subtitle", "no-margin")
                )
                .make()
        );

        Promise.all([onAuth(), checkPermissions(Permissions.Permission.CREATE_IDEA_BOX_SUBMISSIONS)])
        .then(([user, permRes]) => {
            if (!user) { // not logged in
                this.anonymousSwitch.disabled = this.subjectInput.disabled = this.bodyInput.disabled = true;
                this.submitButton.firstChild!.textContent = "Log in om te gebruiken";
                this.submitButton.lastChild!.textContent = "login";
                this.submitButton.addEventListener("click", () => location.href = URLUtil.createLinkBackURL("/login.html", location.href).toString());
            }
            else if (!permRes.CREATE_IDEA_BOX_SUBMISSIONS) { // missing permissions
                this.anonymousSwitch.disabled = this.subjectInput.disabled = this.bodyInput.disabled = true;
                this.submitButton.firstChild!.textContent = "Versturen niet mogelijk";
                this.submitButton.lastChild!.textContent = "cancel_schedule_send";
            }
            else { // can submit
                this.addEventListener("input", () => {
                    this.submitButton.disabled = !this.subjectInput.value || !this.bodyInput.value;
                    this.subjectInput.toggleAttribute("invalid", this.subjectInput.value.length === 0);
                    this.bodyInput.toggleAttribute("invalid", this.bodyInput.value.length === 0);
                });

                this.submitButton.addEventListener("click", () => {
                    this.submitButton.disabled = true; // prevent spam

                    IdeaBox.USER_DB.getById(user.uid)
                    .then(userInfo => {
                        if (!userInfo) {
                            UserFeedback.error(getErrorMessage(undefined));
                            this.submitButton.disabled = false;
                        }
                        else {
                            const submission = new IBSubmissionInfo(
                                StringUtil.generateID(),
                                this.anonymousSwitch.value ? "anonymous" : { id: user.uid, name: `${userInfo?.first_name} ${userInfo?.family_name}` },
                                new Date(),
                                this.subjectInput.value,
                                this.bodyInput.value
                            );

                            IdeaBox.SUBMISSION_DB.write(submission)
                            .then(() => {
                                this.childNodes.forEach(child => {
                                    if (child instanceof HTMLElement) child.hidden = true;
                                    this.feedbackText.hidden = false;
                                });
                            })
                            .catch(err => {
                                UserFeedback.error(getErrorMessage(err));
                                this.submitButton.disabled = false;
                            })
                        }
                    })
                    .catch(err => {
                        UserFeedback.error(getErrorMessage(err));
                        this.submitButton.disabled = false;
                    });
                });
            }
        });

    }

}

customElements.define("idea-box", IdeaBox);