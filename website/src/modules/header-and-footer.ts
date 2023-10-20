import FolderElement from "../common/custom-elements/FolderElement";
import ElementFactory from "../common/html-element-factory/HTMLElementFactory";

// HEADER / NAVBAR

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

    return ElementFactory.a(url)
        .class("link")
        .openInNewTab(isExternal)
        .children(
            ElementFactory.h5(text)
                .children(isExternal ? ElementFactory.span(" open_in_new").class("icon") : null)
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

function createHeader(config:NavbarConfig):HTMLElement {
    return ElementFactory.header()
        .class("page-header", "flex-columns", "main-axis-space-between", "cross-axis-center")
        .children(
            ElementFactory.div()
                .class("desc")
                .children(
                    ElementFactory.a('/').children(ElementFactory.h4("Den Geitenwollen Soc.")),
                    ElementFactory.p("Studievereniging Sociologie Nijmegen").class("subtitle")
                ),
            ElementFactory.div()
                .class("links", "flex-columns", "main-axis-center", "cross-axis-baseline")
                .children(
                    ...createFolderContents(config)
                ),
            ElementFactory.div()
                .class("search", "center-content")
                .children(
                    ElementFactory.p("search").class("icon")
                )
        ).make();
}



// FOOTER + COPYRIGHT NOTICE
function createFooter():Node[] {
    return [
        ElementFactory.footer()
            .class("page-footer", "center-content", "flex-rows")
            .children(
                ElementFactory.h4("Je vindt ons ook op ..."),
                ElementFactory.div()
                    .class("social-media-links", "flex-columns", "main-axis-space-between")
                    .children(
                        ElementFactory.a("https://www.instagram.com/svdengeitenwollensoc/")
                            .children(ElementFactory.img("./images/logos/Instagram_Glyph_Gradient.png", "Instagram")),
                        ElementFactory.a("https://nl.linkedin.com/in/s-v-den-geitenwollen-soc-496145163")
                            .children(ElementFactory.img("./images/logos/LI-In-Bug.png", "Linked-In")),
                        ElementFactory.a("https://www.facebook.com/dengeitenwollensoc/")
                            .children(ElementFactory.img("./images/logos/Facebook_Logo_Primary.png", "Facebook")),
                    )
            )
            .make(),
        
        ElementFactory.h5(`© ${new Date().getFullYear()} Den Geitenwollen Soc.`)
            .class("copyright-notice")
            .make()
    ];
}


// create header and footer before page-load
const HEADER = createHeader(NAVBAR_CONFIG);
const FOOTER = createFooter();

// insert both after page-load
window.addEventListener("DOMContentLoaded", () => {    
    document.body.prepend(HEADER);
    document.body.append(...FOOTER);
});
