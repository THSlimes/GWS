import * as IBAN from "iban";

import ElementFactory from "../html-element-factory/ElementFactory";
import Loading from "../Loading";
import { HasSections, HasValue } from "../util/UtilTypes";
import MultisourceAttachment from "./MultisourceAttachment";
import PasswordInput from "./PasswordInput";
import Switch from "./Switch";
import UserFeedback from "../ui/UserFeedback";
import UserDatabase, { UserInfo } from "../firebase/database/users/UserDatabase";
import FirestoreUserDatabase from "../firebase/database/users/FirestoreUserDatabase";
import { createUserWithEmailAndPassword, User } from "@firebase/auth";
import { FIREBASE_AUTH } from "../firebase/init-firebase";
import getErrorMessage from "../firebase/authentication/error-messages";



class RegistrationForm extends HTMLElement implements HasSections<RegistrationForm.Section>, HasValue<RegistrationForm.Value> {

    private static readonly USER_DB: UserDatabase = new FirestoreUserDatabase();

    private static readonly LEGAL_NAME_REGEX = /^[A-Za-zÀ-öø-ȳ\.]+([ \-`'\/,][A-Za-zÀ-öø-ȳ\.]+)*$/;
    /** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
    private static readonly EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    private static readonly STUDENT_NUMBER_REGEX = /^S[0-9]+$/;
    private static readonly BIC_REGEX = /^[A-Z]{4}[A-Z]{2}[0-9A-Z]{2}([0-9A-Z]{3})?$/;

    private static readonly MAX_BIRTH_DATE = new Date();
    static { this.MAX_BIRTH_DATE.setFullYear(this.MAX_BIRTH_DATE.getFullYear() - 18); }

    private readonly applyAgeRestriction: boolean;

    public ["first-name"]!: HTMLInputElement;
    public ["infix"]!: HTMLInputElement;
    public ["family-name"]!: HTMLInputElement;
    public ["email"]!: HTMLInputElement;
    public ["password"]!: PasswordInput;
    public ["confirm-password"]!: PasswordInput;
    public ["phone-number"]!: HTMLInputElement;
    public ["birth-date"]!: HTMLInputElement;
    public ["study"]!: HTMLSelectElement;
    public ["student-number"]!: HTMLInputElement;
    public ["iban"]!: HTMLInputElement;
    public ["bic"]!: HTMLInputElement;
    public ["bank-account-name"]!: HTMLInputElement;
    public ["receive-news-letter"]!: Switch;
    public ["allow-public-photos"]!: Switch;
    public ["allow-private-photos"]!: Switch;
    public ["add-to-whatsapp"]!: Switch;
    public ["accept-privacy-statement"]!: Switch;
    public ["allow-bank-transactions"]!: Switch;

    public ["submit-button"]!: HTMLButtonElement;

    get value(): RegistrationForm.Value {
        return {
            name: {
                first_name: this["first-name"].value.trim(),
                infix: this.infix.value.trim(),
                family_name: this["family-name"].value.trim()
            },
            email: this.email.value.trim(),
            password: {
                password: this.password.value.trim(),
                confirmation: this["confirm-password"].value.trim()
            },
            phone_number: this["phone-number"].value.trim(),
            birth_date: this["birth-date"].valueAsDate,
            study: this.study.value.trim(),
            student_number: this["student-number"].value.trim(),
            bank_account: {
                iban: this.iban.value.trim(),
                bic: this.bic.value.trim(),
                holder: this["bank-account-name"].value.trim()
            },
            receive_news_letter: this["receive-news-letter"].value,
            allow_social_media: {
                public: this["allow-public-photos"].value,
                private: this["allow-private-photos"].value
            },
            add_to_whatsapp: this["add-to-whatsapp"].value,
            accept_privacy_statement: this["accept-privacy-statement"].value,
            allow_auto_transactions: this["allow-bank-transactions"].value
        };
    }

    set value(newVal: RegistrationForm.Value) {
        throw new Error("value of RegistrationForm cannot be set");
    }

    public get validity() {
        const invalidElements = this.querySelectorAll("*[invalid]");
        if (invalidElements.length === 0) return true;

        for (let i = 0; i < invalidElements.length; i++) {
            const elem = invalidElements[i];
            if (elem.getAttribute("invalid")?.length) return elem.getAttribute("invalid");
        }

        return false;
    }

    constructor(applyAgeRestriction = true) {
        super();

        this.applyAgeRestriction = applyAgeRestriction;

        this.initElement();
    }

    initElement(): void {
        let password8Chars: HTMLSpanElement;
        let passwordHasCapital: HTMLSpanElement;
        let passwordHasDigit: HTMLSpanElement;
        let passwordHasSpecialChar: HTMLSpanElement;

        this.appendChild(
            ElementFactory.form()
                .class("boxed", "section-padding", "flex-rows", "cross-axis-center", "min-section-gap")
                .children(
                    ElementFactory.h2("Inschrijfformulier"),
                    ElementFactory.div(undefined, "section", "flexible", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Naam")
                                .class("section-name"),
                            ElementFactory.div(undefined, "section", "flex-columns", "main-axis-end", "cross-axis-center", "in-section-gap", "flex-wrap")
                                .children(
                                    this["first-name"] = ElementFactory.input.text()
                                        .name("first-name")
                                        .placeholder("Voornaam...")
                                        .autocomplete("given-name")
                                        .size(30)
                                        .validateValue(v => v.length === 0 ?
                                            "Vul eerst je voornaam in" :
                                            RegistrationForm.LEGAL_NAME_REGEX.test(v) || "Voornaam is ongeldig."
                                        )
                                        .make(),
                                    this["infix"] = ElementFactory.input.text()
                                        .name("infix")
                                        .placeholder("Tussenvoegsel...")
                                        .size(10)
                                        .validateValue(v => v.length === 0 || RegistrationForm.LEGAL_NAME_REGEX.test(v) || "Tussenvoegsel is ongeldig")
                                        .make(),
                                    this["family-name"] = ElementFactory.input.text()
                                        .name("family-name")
                                        .placeholder("Achternaam...")
                                        .autocomplete("family-name")
                                        .size(30)
                                        .validateValue(v => v.length === 0 ?
                                            "Vul eerst je achternaam in" :
                                            RegistrationForm.LEGAL_NAME_REGEX.test(v) || "Achternaam is ongeldig."
                                        )
                                        .make(),
                                )
                        ),
                    ElementFactory.div(undefined, "section", "flexible", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("E-mailadres")
                                .class("section-name"),
                            this.email = ElementFactory.input.email()
                                .name("email")
                                .autocomplete("email")
                                .size(40)
                                .attr("required")
                                .validateValue(v => v.length === 0 ?
                                    "Vul eerst je e-mailadres in" :
                                    RegistrationForm.EMAIL_REGEX.test(v) || "E-mailadres is ongeldig."
                                )
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-rows", "main-axis-space-between", "in-section-gap")
                        .children(
                            ElementFactory.p()
                                .class("section-name")
                                .children(
                                    "Account wachtwoord ",
                                    ElementFactory.span(undefined, "subtitle")
                                        .children(
                                            '(',
                                            password8Chars = ElementFactory.span("min. 8 karakters", "password-min-length").make(),
                                            ", ",
                                            passwordHasCapital = ElementFactory.span("hoofdletter", "password-has-capital").make(),
                                            ", ",
                                            passwordHasDigit = ElementFactory.span("een cijfer", "password-has-digit").make(),
                                            " en ",
                                            passwordHasSpecialChar = ElementFactory.span("een speciaal teken", "password-has-special-char").make(),
                                            ')'
                                        ),
                                    ElementFactory.ul()
                                        .class("no-margin", "flex-rows", "in-section-gap")
                                        .children(
                                            ElementFactory.li()
                                                .class("subsection", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                                                .children(
                                                    ElementFactory.p("Wachtwoord"),
                                                    this.password = ElementFactory.passwordInput(PasswordInput.Type.NEW, "new-password")
                                                        .validateValue(
                                                            v => [
                                                                !password8Chars.toggleAttribute("invalid", v.length < 8),
                                                                !passwordHasCapital.toggleAttribute("invalid", !/[A-Z]/.test(v)),
                                                                !passwordHasDigit.toggleAttribute("invalid", !/[0-9]/.test(v)),
                                                                !passwordHasSpecialChar.toggleAttribute("invalid", !/[!@#$%^&*\-_=+|\\/:~]/.test(v))
                                                            ].every(s => s) || "Wachtwoord is ongeldig."
                                                        )
                                                        .on("input", () => this["confirm-password"].dispatchEvent(new Event("input")))
                                                        .make(),
                                                ),
                                            ElementFactory.li()
                                                .class("subsection", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                                                .children(
                                                    ElementFactory.p("Herhaal wachtwoord"),
                                                    this["confirm-password"] = ElementFactory.passwordInput(PasswordInput.Type.NEW, "new-password-confirmation")
                                                        .validateValue(v => (v.length && v === this.password.value) || "Wachtwoord en herhaalwachtwoord zijn niet hetzelfde.")
                                                        .make(),
                                                ),
                                        )
                                )
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Telefoonnummer")
                                .class("section-name"),
                            this["phone-number"] = ElementFactory.input.tel()
                                .value("+316")
                                .name("phone-number")
                                .autocomplete("tel")
                                .validateValue(v => v.length >= 7 || "Vul eerst je telefoonnummer in.")
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Geboortedatum")
                                .class("section-name"),
                            this["birth-date"] = ElementFactory.input.date()
                                .name("birth-date")
                                .attr("required")
                                .max(this.applyAgeRestriction ? RegistrationForm.MAX_BIRTH_DATE : new Date())
                                .validateValue((...v) => (v.length === 1 && (!this.applyAgeRestriction || v[0] <= RegistrationForm.MAX_BIRTH_DATE)) || "Geboortedatum is ongeldig.")
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Ik studeer ...")
                                .class("section-name"),
                            this.study = ElementFactory.select({
                                "Sociologie": "Sociologie",
                                "Geen sociologie": "Geen sociologie",
                                "Studeert niet meer": "Niet (meer)"
                            })
                                .value("Sociologie")
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Studentnummer")
                                .class("section-name"),
                            this["student-number"] = ElementFactory.input.text("S")
                                .placeholder("S...")
                                .name("student-number")
                                .size(10)
                                .validateValue(v => this.study.value === "Niet (meer)" || RegistrationForm.STUDENT_NUMBER_REGEX.test(v) || "Studentnummer is ongeldig.")
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flexible", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Bankrekening")
                                .class("section-name"),
                            ElementFactory.div(undefined, "flex-columns", "main-axis-end", "in-section-gap", "flex-wrap")
                                .children(
                                    this.iban = ElementFactory.input.text()
                                        .attr("required")
                                        .name("iban")
                                        .placeholder("IBAN...")
                                        .size(34)
                                        .validateValue(v => v.length === 0 ?
                                            "Vul eerst je IBAN in." :
                                            IBAN.isValid(v) || "IBAN is ongeldig."
                                        )
                                        .make(),
                                    this.bic = ElementFactory.input.text()
                                        .name("bic")
                                        .placeholder("BIC...")
                                        .size(11)
                                        .attr("required")
                                        .validateValue(v => v.length === 0 ?
                                            "Vul eerst je BIC in." :
                                            RegistrationForm.BIC_REGEX.test(v) || "BIC is ongeldig."
                                        )
                                        .make(),
                                    this["bank-account-name"] = ElementFactory.input.text()
                                        .name("bank-account-name")
                                        .placeholder("Naam rekeninghouder...")
                                        .autocomplete("cc-name")
                                        .size(30)
                                        .attr("required")
                                        .validateValue(v => v.length === 0 ?
                                            "Vul eerst de naam van de rekeninghouder in." :
                                            RegistrationForm.LEGAL_NAME_REGEX.test(v) || "Naam van de rekeninghouder is ongeldig."
                                        )
                                        .make(),
                                )
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Ik wil de GWS nieuwsbrief ontvangen")
                                .class("section-name"),
                            this["receive-news-letter"] = ElementFactory.input.switch(true)
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-rows", "main-axis-space-between", "in-section-gap")
                        .children(
                            ElementFactory.p("Foto's van mij mogen geplaatst worden op ...")
                                .class("section-name"),
                            ElementFactory.ul()
                                .class("no-margin", "flex-rows", "in-section-gap")
                                .children(
                                    ElementFactory.li()
                                        .class("subsection", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                                        .children(
                                            ElementFactory.p("Openbare sociale media"),
                                            this["allow-public-photos"] = ElementFactory.input.switch(false)
                                                .make(),
                                        ),

                                    ElementFactory.li()
                                        .class("subsection", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                                        .children(
                                            ElementFactory.p("Besloten sociale media"),
                                            this["allow-private-photos"] = ElementFactory.input.switch(false)
                                                .make(),
                                        ),
                                )
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p("Ik wil worden toegevoegd aan de algemene Whatsappgroep voor aankondigingen van activiteiten.")
                                .class("section-name"),
                            this["add-to-whatsapp"] = ElementFactory.input.switch(false)
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p()
                                .children(
                                    "Hierbij geef ik aan dat ik akkoord ga met het ",
                                    ElementFactory.a(undefined, "privacy statement")
                                        .class("privacy-statement-link")
                                        .openInNewTab(true)
                                        .download()
                                        .onMake(self => { // get privacy statement link from storage
                                            Loading.useDynamicContent(
                                                MultisourceAttachment.getInfoFromFirebase("openbaar", "privacy-statement.pdf"),
                                                fileInfo => self.href = fileInfo.href,
                                                err => {
                                                    console.error(err);
                                                    self.toggleAttribute("error", true);
                                                }
                                            );
                                        }),
                                    " van de vereniging.",
                                    ElementFactory.span("*")
                                        .tooltip("Verplicht")
                                )
                                .class("section-name"),
                            this["accept-privacy-statement"] = ElementFactory.input.switch(false)
                                .on("input", (_, self) => {
                                    if (self.value) self.removeAttribute("invalid");
                                    else self.setAttribute("invalid", "Akkoord gaan met het privacystatement is vereist om lid te worden.");
                                })
                                .onMake(self => self.dispatchEvent(new Event("input")))
                                .make()
                        ),
                    ElementFactory.div(undefined, "section", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                        .children(
                            ElementFactory.p()
                                .children(
                                    "Het lidmaatschap loopt officieel van 1 oktober tot 1 oktober van het daarop volgende jaar. Indien het lidmaatschap niet voor 1 september wordt opgezegd word het automatisch met een termijn van één studiejaar verlengd. Door dit vakje aan te vinken geef ik toestemming dat den Geitenwollen Soc. automatische incasso’s mag uitvoeren om mijn jaarlijkse contributie te innen zolang mijn lidmaatschap loopt.",
                                    ElementFactory.span("*")
                                        .tooltip("Verplicht")
                                )
                                .class("section-name"),
                            this["allow-bank-transactions"] = ElementFactory.input.switch(false)
                                .on("input", (_, self) => {
                                    if (self.value) self.removeAttribute("invalid");
                                    else self.setAttribute("invalid", "Akkoord gaan met het automatische incasso's is vereist om lid te worden.");
                                })
                                .onMake(self => self.dispatchEvent(new Event("input")))
                                .make()
                        ),
                    this["submit-button"] = ElementFactory.button((e, self) => {
                        e.preventDefault();

                        const validity = this.validity;
                        if (!validity) UserFeedback.error("Gegevens zijn ongeldig"); // unknown invalidating reason
                        else if (typeof validity === "string") UserFeedback.error(validity); // known invalidating reason
                        else { // form data is valid
                            self.disabled = true;
                            this.createAccount()
                                .then(() => {

                                })
                                .catch(err => {
                                    UserFeedback.error(getErrorMessage(err));
                                    this["submit-button"].disabled = false;
                                });
                        }
                    })
                        .class("flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.h4("Verstuur formulier"),
                            ElementFactory.h4("send")
                                .class("icon")
                        )
                        .make()
                )
                .make()
        );
    }

    /**
     * Creates a new account using the filled-in information. Afterwards, the useragent
     * will be signed into the newly created account.
     */
    private createAccount(): Promise<void> {

        if (this.validity !== true) throw new Error("Cannot submit invalid form data"); // sanity check

        const formData = this.value;

        let userAccount: User;
        let userDBEntry: UserInfo;

        return createUserWithEmailAndPassword(FIREBASE_AUTH, formData.email, formData.password.password)
            .then(userCred => userCred.user)
            .then(user => userAccount = user)
            .then(user => RegistrationForm.USER_DB.write(
                userDBEntry = new UserInfo(
                    user.uid,
                    new Date(),
                    new Date(Date.now() - 1000 * 60 * 60 * 24),
                    formData.name.first_name,
                    formData.name.infix ? `${formData.name.infix} ${formData.name.family_name}` : formData.name.family_name,
                    []
                )
            ))
            .then(() => RegistrationForm.submitToConscribo(formData))
            .then(res => {
                console.log(res);

                UserFeedback.success("Je account is succesvol aangemaakt. Welkom bij GWS!", 5000, () => location.href = '/');
            })
            .catch(err => { // something went wrong
                if (userAccount) userAccount.delete(); // remove account
                if (userDBEntry) RegistrationForm.USER_DB.delete(userDBEntry); // remove database entry

                throw err;
            });
    }

}

namespace RegistrationForm {

    export type Section =
        "first-name" |
        "infix" |
        "family-name" |
        "email" |
        "password" |
        "confirm-password" |
        "phone-number" |
        "birth-date" |
        "study" |
        "student-number" |
        "iban" |
        "bic" |
        "bank-account-name" |
        "receive-news-letter" |
        "allow-public-photos" |
        "allow-private-photos" |
        "add-to-whatsapp" |
        "accept-privacy-statement" |
        "allow-bank-transactions" |
        "submit-button";


    export interface Value {
        name: { first_name: string, infix: string, family_name: string },
        email: string,
        password: { password: string, confirmation: string },
        phone_number: string,
        birth_date: Date | null,
        study: string,
        student_number: string,
        bank_account: { iban: string, bic: string, holder: string }
        receive_news_letter: boolean,
        allow_social_media: { public: boolean, private: boolean },
        add_to_whatsapp: boolean,
        accept_privacy_statement: boolean,
        allow_auto_transactions: boolean
    }


    export function submitToConscribo(data: Value): Promise<string> {
        return new Promise((resolve, reject) => {
            submitToConscribo.getURL()
                .then(url => {
                    const postData = {
                        "2": data.name.first_name,
                        "3": data.name.infix,
                        "4": data.name.family_name,
                        "5": data.email,
                        "6": data.phone_number,
                        "7": {
                            "iban": data.bank_account.iban,
                            "bic": data.bank_account.bic,
                            "name": data.bank_account.holder
                        },
                        "8": data.birth_date && `${data.birth_date.getFullYear()}-${data.birth_date.getMonth() + 1}-${data.birth_date.getDate()}`,
                        "9": data.student_number,
                        "13": data.receive_news_letter ? "Wel de nieuwsbrief" : "Niet de nieuwsbrief",
                        "16": data.study,
                        "20": data.allow_auto_transactions,
                        "26": data.accept_privacy_statement,
                        "28": data.add_to_whatsapp ? { "0": "Whatsappgroep" } : {},
                        "29": {
                            ...(data.allow_social_media.public ? { "0": "Openbare sociale media" } : {}),
                            ...(data.allow_social_media.private ? { "1": "Besloten sociale media" } : {})
                        }
                    };

                    const req = new XMLHttpRequest();
                    req.onerror = () => reject(req.statusText);
                    req.onload = () => {
                        if (req.status < 200 || req.status >= 300) reject(req.statusText);
                        else resolve(req.responseText);
                    }
                    req.open("POST", url, true);
                    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    req.send(`formData=${encodeURIComponent(JSON.stringify(postData))}`);
                })
                .catch(reject);
        });
    }

    export namespace submitToConscribo {

        const FORM_SRC = "https://leden.conscribo.nl/dengeitenwollensoc/jsForm/load/4a34/cwfWordpressForm";
        function getSessionID(): Promise<string> {
            return fetch(FORM_SRC) // fetch form insertion script
                .then(res => res.text()) // get text
                .then(text => { // extract session id
                    const match = text.match(/this.sessionId = '(.+)';/)![0];
                    const [fromInd, toInd] = [match.indexOf(`'`) + 1, match.lastIndexOf(`'`)]
                    return match.substring(fromInd, toInd);
                });
        }

        const BASE_URL = new URL("https://leden.conscribo.nl/dengeitenwollensoc/jsForm/postForm/4a34/");
        export function getURL(): Promise<string> {
            return getSessionID()
                .then(sessionID => {
                    BASE_URL.searchParams.set("sessionId", sessionID);
                    return BASE_URL.toString();
                });
        }
    }

}

customElements.define("registration-form", RegistrationForm);

export default RegistrationForm;