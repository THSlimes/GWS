import FolderElement, { FoldingDirection } from "../common/custom-elements/FolderElement";
import ElementFactory from "../common/html-element-factory/HTMLElementFactory";

const DEFAULT_LINK = "/";

type NavbarConfig = { [name:string]: NavbarConfig | string }
const NAVBAR_CONFIG:NavbarConfig = {
    "Vereniging": {
        "Algemeen": DEFAULT_LINK,
        "Verenigingsblad 't blaatje": DEFAULT_LINK,
        "Lidmaatschap": DEFAULT_LINK,
        "Huidig bestuur": {
            "Voorzitter": DEFAULT_LINK,
            "Penningmeester en Commissaris Interne Betrekkingen": DEFAULT_LINK,
            "Secretaris": DEFAULT_LINK,
            "Commissaris Algemene Zaken": DEFAULT_LINK
        },
        "Oud-besturen": DEFAULT_LINK,
        "Commissies": {
            "’t Blaatje": DEFAULT_LINK,
            "Contentcommissie": DEFAULT_LINK,
            "Carrièrecommissie": DEFAULT_LINK,
            "Den Geitenwollen Soccer": DEFAULT_LINK,
            "Dinercommissie": DEFAULT_LINK,
            "Feestcommissie": DEFAULT_LINK,
            "Formele Activiteitencommissie": DEFAULT_LINK,
            "Introductiecommissie": DEFAULT_LINK,
            "Jaarboekcommissie": DEFAULT_LINK,
            "Kascontrolecommissie": DEFAULT_LINK,
            "Lustrumcommissie": DEFAULT_LINK,
            "Sportcommissie": DEFAULT_LINK,
            "Studiereiscommissie": DEFAULT_LINK,
            "Weekendcommissie": DEFAULT_LINK
        },
        "GWS-kamer": DEFAULT_LINK
    },
    "Agenda": DEFAULT_LINK,
    "Onderwijs": {
        "Aankomende studente": DEFAULT_LINK,
        "Sociologie": DEFAULT_LINK,
        "Studieadviseur": DEFAULT_LINK,
        "Medezeggenschap": DEFAULT_LINK,
        "Boekenverkoop": DEFAULT_LINK
    },
    "Carrière": {
        "Bedrijfsprofielen": DEFAULT_LINK,
        "Alumni aan het woord": {
            "Acht vragen aan Anna Reith": DEFAULT_LINK,
            "Acht vragen aan Sanne van der Drift": DEFAULT_LINK,
            "Tien vragen aan Sander Sloot": DEFAULT_LINK,
            "Elf vragen aan Hakim Bouali": DEFAULT_LINK,
            "Twaalf vragen aan Joris Blaauw": DEFAULT_LINK,
            "Tien vragen aan Roza Meuleman": DEFAULT_LINK,
            "Twaalf vragen aan Camiel Margry": DEFAULT_LINK,
            "Elf vragen aan Gideon van der Hulst": DEFAULT_LINK
        },
        "Vacatures": DEFAULT_LINK
    },
    "Samenwerkingen": {
        "Wat bieden wij?": DEFAULT_LINK,
        "Onze sponsoren": DEFAULT_LINK,
        "GWS-sticker": DEFAULT_LINK
    },
    "Leden": {
        "Bestuurswerving": DEFAULT_LINK,
        "Declaratieformulier": DEFAULT_LINK,
        "Documenten": DEFAULT_LINK,
        "Huidige dealtjes": DEFAULT_LINK,
        "Foto's": DEFAULT_LINK,
        "Ideeënbox": DEFAULT_LINK,
        "Inschrijvingen activiteiten": DEFAULT_LINK,
        "Inzendingen nieuwsbrief": DEFAULT_LINK,
        "Samenvattingen": DEFAULT_LINK,
        "Vertrouwenspersonen": DEFAULT_LINK,
    },
    "Contact": {
        "Contactgegevens": DEFAULT_LINK
    },
    "Inschrijven Den Geitenwollen Soc.": DEFAULT_LINK
};

function createLink(text:string, url:string):HTMLAnchorElement {
    let isExternal = false;
    try {
        const parsed = new URL(url);
        isExternal = parsed.hostname !== window.location.hostname;
    } catch (e) { /* assume internal link */ }

    return ElementFactory.a()
        .class("link")
        .href(url)
        .openInNewTab(isExternal)
        .children(
            ElementFactory.h5()
                .text(text)
                .children(isExternal ? ElementFactory.span().class("icon").text(" open_in_new") : null)
        ).make();
}

function createFolderContents(config:NavbarConfig, nestingLvl=0):(FolderElement|HTMLAnchorElement)[] {
    const out:(FolderElement|HTMLAnchorElement)[] = [];
    
    for (const heading in config) {
        const v = config[heading];
        if (typeof v === "string") out.push(createLink(heading, v));
        else {            
            const folder = new FolderElement(heading, nestingLvl === 0 ? "down" : "right", 200);
            folder.append(...createFolderContents(v, nestingLvl+1));
            out.push(folder);
        }
    }

    return out;
}

function insertHeader(config:NavbarConfig) {
    const header = ElementFactory.header()
        .class("page-header", "flex-columns", "main-axis-space-between", "cross-axis-center")
        .children(
            ElementFactory.div()
                .class("desc")
                .children(
                    ElementFactory.h4().text("Den Geitenwollen Soc."),
                    ElementFactory.p().class("subtitle").text("Studievereniging Sociologie Nijmegen")
                ),
            ElementFactory.div()
                .class("links", "flex-columns", "main-axis-center", "cross-axis-baseline")
                .children(
                    ...createFolderContents(config)
                ),
            ElementFactory.div()
                .class("search", "center-content")
                .children(
                    ElementFactory.p().class("icon").text("search")
                )
        ).make();
    
    document.body.prepend(header);
}

window.addEventListener("load", () => {
    insertHeader(NAVBAR_CONFIG);
});