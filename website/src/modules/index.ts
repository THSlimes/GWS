import "../common/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";
import SmartArticle from "../common/custom-elements/SmartArticle";

const RECENT_MESSAGES_ELEM = document.getElementById("recent-messages")!;

type Article = { heading:string, body:string };
const ARTICLES:Article[] = [
    {
        heading: "Het XXXIe kandidaatsbestuur stelt zich voor: Luuk van Nieuwland",
        body: `Hé hoi beste geitjes,

        Mijn naam is Luuk en ik mag met gepaste trots zeggen dat ik volgend jaar voorzitter zal zijn van Den GWS. Momenteel ben ik 20 jaar oud en ga komend jaar mijn tweede jaar in als sociologiestudent. Mijn jeugd bestond voornamelijk uit het kijken naar koeien en het aanhoren van trekkers. Ik ben namelijk opgegroeid in de Achterhoek, in Hengelo (Gelderland) om precies te zijn. Het piepkleine dorp dat alleen echte Meilandjesfans kennen. Ik ben echter geboren in Haarlem, dus zeg altijd stoer dat ik uit Haarlem kom omdat dit naar mijn mening toch net wat interessanter klinkt (ook al hebben de meilandjes hier nooit gewoond). Inmiddels woon ook ik al een tijdje in die mooie stad aan de Waal en wil hier voorlopig ook nog niet weg.
        
        In mijn eerste jaar als sociologiestudent en GWS lid heb ik al hoop van Nijmegen mogen zien en een hoop nieuwe mensen ontmoet. Binnen Den GWS was ik afgelopen jaar actief in de eerstejaars- en galacommissie, mede hierdoor zag ik wat voor vreselijk mooie groep mensen Den GWS eigenlijk is. Een groep waar ik me vrijwel direct heel erg thuis voelde. Ik vind het dan ook een echte eer om deze als bestuur te mogen vertegenwoordigen volgend jaar.
        
        Naast hard studeren zijn er natuurlijk ook dingen die ik graag in mijn vrije tijd doe. Om het hoofd een beetje af te leiden van al dat leren ga ik graag wat drinken met vrienden, pak een concert mee of duik s’avonds een van de leuke kroegen in Nijmegen in. Naast het hoofd probeer ik ook het lichaam de nodige aandacht te geven door een paar keer per week te gaan judoën. Ik ben zelfs lid van de Nijmeegse judovereniging Fudoshin. Helaas kom ik hier wel echt te weinig. Maar goed, zo hou je geest en lichaam een beetje in balans.
        
        Tot slot rest mij te zeggen dat ik enorm naar volgend jaar uitkijk. Ik hoop er voor jullie allen te kunnen zijn en samen met mijn medebestuursleden en jullie een mooi jaar van te maken. Het zal niet altijd even makkelijk worden, maar met een beetje vertrouwen komt het vast goed. Het leven is namelijk eigenlijk net als het sinterklaasjournaal, uiteindelijk komt alles altijd goed.
        
        Groetjes,
        
        Luuk`
    },
    {
        heading: "Het XXXIe kandidaatsbestuur stelt zich voor: Johan Reitsma",
        body: `Hoii lieve GWS’ers,

        Ik ben Johan, en komend jaar zal ik onze secretaris zijn. Ik ben 19 jaar en aankomend jaar zal ik tweedejaars student zijn. Dit jaar had ik enorm genoten van alles omtrent Den GWS, van de koekjes in de GWS-kamer tot de feesten in de Molenstraat. Ik ben dan ook ontzettend dankbaar dat ik komend jaar deze mooie rol als secretaris mag vervullen voor Den Geitenwollen Soc.
        
        Hoewel ik nog maar kort in Nijmegen woon en constant de weg kwijt ben, voel ik mij hier al helemaal thuis. Toch ben ik ook erg blij als ik in het weekend mijn vader op kan zoeken in Lochem (wat in de Achterhoek ligt). Hiervoor heb ik ook in Hilversum en Almere gewoond. Vaak hoor je online maar ook in het echt enorme haat jegens Almere, maar dat is de grootste onzin. Ik zal door de vier jaartjes die ik heb gewoond in Almere deze mooie stad de rest van mijn leven blijven verdedigen.
        
        Ik geniet van Youtube kijken, met vrienden afspreken, maar ook gewoon van Sociologie studeren. Op de middelbare had ik een soort Stockholmsyndroom door de BINAS-vakken die allemaal in mijn pakket zaten. Nu ik heb toegegeven dat dit helemaal niks is voor mij en Sociologie ging doen is leren opeens een stuk leuker. Ik hou ook enorm veel van concerten, maar ook het luisteren van muziek in het algemeen. Toch bak ik helemaal niks van zelf muziek maken. Ik heb 5 jaar op pianoles gezeten, en het enige wat ik nog kan is ‘Mieke heeft een lammetje’ spelen.
        
        Om deze concerten te kunnen veroorloven werk ik ook veel als klantenservicemedewerker. Dit doe ik voor NS, waardoor ik door alle horrorverhalen die ik hoor nog meer stress heb bij vertraging of bij het nemen van de laatste avondtrein dan ik hiervoor al had. Voor de rest is mijn baantje helemaal top. Het heeft me van mijn bel angst afgeholpen, ik mag Facebook moeders uitleggen hoe ze een e-ticket kunnen openen en ik kan ondanks Twitter’s rate limit tweets blijven bekijken (hoewel het dan allemaal klaag tweets richting NS zijn).
        
        Als je de huidig GWChess kampioen uit wilt dagen voor een potje schaken, advies nodig hebt voor je treinrit, of gewoon een goed gesprek wilt, je weet me komend jaar vast te vinden. Ik heb er alle vertrouwen in dat mijn medebestuur en ik er komend jaar een feestje van zullen maken, en jullie zijn allemaal uitgenodigd (ik vertel niet wat we gaan doen, maar neem je zwembroek mee 😉).
        
        Liefs,
        
        Johan`
    },
    {
        heading: "Het XXXIe kandidaatsbestuur stelt zich voor: Bo Naber",
        body: `Hallo lieve geitjes, ik ben Bo!

        Volgend jaar mag ik de prachtige rol van penningmeester gaan vervullen bij Den GWS. Ik ben 19 jaar oud en ga nu m’n derde jaar van de sociologie bachelor in. Ik woon al anderhalf in het mooie Nijmegen en heb hier helemaal m’n plekkie gevonden! Origineel kom ik uit Apeldoorn en ik ga daar graag nog naar terug, maar niks verslaat de Nijmeegse gezelligheid en het mooie centrum.
        
        Afgelopen twee jaar heb ik in de KLAC, FEC, studiereiscommissie en bij het Blaatje gezeten en mocht ik ook trots hoofd zijn van de FEC. Zo ben ik ontzettend gaan houden van deze mooie vereniging! Den GWS is een sociale, leuke, gezellige en actieve vereniging waar iedereen welkom is. Ik heb ontzettend veel zin om deze te mogen helpen besturen volgend jaar!
        
        Naast een actief geitje zijn en te veel tijd besteden in de GWS-kamer, doe ik nog genoeg andere dingen. Ik werk graag bij café Eten&Drinken in Nijmegen Oost (kom allemaal gezellig een kopje koffie drinken!) en geef al mijn zuurverdiende geld uit aan terrassen in de stad. Ik hou ontzettend veel van shoppen, specifiek in de Lange Hezelstraat, en van sporten bij het Sportcentrum. Voor al deze dingen geldt dat ik het maar al te gezellig vind om het samen te doen! Ik ben altijd wel te porren voor een bokslesje of een cocktailavond en schroom dus niet om me uit te nodigen.
        
        Ik hou onwijs veel van eten, drankjes doen en spelletjes, het liefst allemaal samen. Ik hou erg van uitgebreid koken, maar een nieuw restaurant uitproberen vind ik ook ontzettend leuk. Wijnen en roddelen is één van mijn favoriete bezigheden. Een lekkere rode wijn of Aperol Spritz met een portie bitterballen en ik ben in de zevende hemel. Als daar nog bordspelletjes bijkomen ben ik al helemaal verkocht. Perudo, Qwixx, Stressen en Klootzakken zijn mijn persoonlijke favorieten, maar ik sta altijd open voor wat nieuws.
        
        Al met al ben ik gezellig en sociaal, soms een heeeeel klein beetje eigenwijs, en altijd open voor een gezellig gesprek over van alles en nog wat. Je kan altijd op me afstappen voor hulp met je tentamens of met SPSS, maar ook zeker voor gewoon even kletsen. Ik heb onwijs veel zin in volgend jaar en ik ga er samen met mijn bestuur een goed feestje van maken. Ik zie jullie snel!
        
        Groetjes van Bo 🙂`
    },
    {
        heading: "Het XXXIe kandidaatsbestuur stelt zich voor: Mette van Hengel",
        body: `Hii lieve geitjes,


        Ik ben Mette en ik zal aankomend jaar met veel trots jullie Commissaris Interne Betrekkingen worden. Ik zal mezelf even voorstellen zodat jullie hopelijk een beetje een beeld krijgen van jullie aankomende CIB. Ik ben 21 jaar en ga aankomend jaar mijn tweede jaar van sociologie in. Ik kom oorspronkelijk uit Weert dit ligt in Limburg, en dat gaat vast opvallen (als het niet aan mijn accent is dan wel door mijn enthousiasme over bijvoorbeeld de Limburgse carnaval). Afgelopen jaar heb ik het prachtige Limburg achter me gelaten om dit om te ruilen voor het hele mooie, maar vooral mega gezellige Nijmegen.
        
        Ik hou ervan om uitgebreid te koken, voor mijn vrienden, huisgenoten of familie, word heel gelukkig van in de zon op een terrasje zitten, ben veel te fanatiek met spelletjes en ik ben de grootste carnavalsfan die er bestaat. Hiervoor maak ik dan ook vanaf de 11de van de 11de mijn eigen kostuums (ja meervoud want voor elke dag een andere).
        In mijn eerste jaar als sociologiestudent ben ik meteen lid geworden van Den GWS en ben actief lid geworden van de feestcommissie. Den GWS zorgde ervoor dat ik een hele hoop nieuwe vrienden kreeg maar er ook een hele hoop mega leuke activiteiten op de planning stonden. Ik werd met open armen ontvangen en heb dan ook het beste eerste jaar gehad wat ik me kan bedenken. Door dit super leuke eerste jaar ben ik super enthousiast geworden voor een bestuursjaar. En ben ik nu super trots dat ik mag zeggen dat ik volgend jaar hopelijk net zo een leuk jaar ga neerzetten.
        
        Om me nog een beetje beter te leren kennen heb ik voor jullie nog een aantal nutteloze feitjes over mezelf; Ik heb ooit kauwgom gestolen voor mijn zus omdat ik toen nog niet snapte dat je voor dingen in de supermarkt moest betalen. Toen ik 11 was heb ik voor het eerst op en tractor gereden (daarna nooit meer want ik was te bang). Mijn papa is geboren in Kameroen. Ik heb een ini mini tattoo op mijn rug, en ik spoel in films altijd de enge stukken door omdat ik dan niet meer durf te kijken (mijn omgeving vind dit erg irritant).
        Nou dit waren de mega nutteloze feitjes over mij, maar als je nog meer van me wilt weten of iets anders wilt vragen dan mag dat altijd.
        
        Ik kan niet wachten tot mijn bestuursjaar begint en ik heb er alle vertrouwen in dat ik samen met mijn andere bestuursleden; Bo, Hannah, Johan en Luuk, een super leuke tijd ga hebben en dat we er alles aan gaan doen om een zo leuk mogelijk jaar neer te zetten voor jullie!
        Dat was hem wel weer, ik zie jullie vast snel.
        
        Groetjesss,
        Mette`
    },
    {
        heading: "Het XXXIe kandidaatsbestuur stelt zich voor: Hannah Jacobs",
        body: `Hoi hoi, ik ben Hannah,

        Ik ga in het bestuur de rol van Commissaris Algemene Zaken vervullen. Dit houdt in dat ik verantwoordelijk ben voor de externe relaties van de vereniging en de sponsoring en dat ik hiernaast ruimte heb om extra taken op me te nemen. In mijn dagelijkse leven ben ik vooral bij Den GWS en bij De Kindertelefoon te vinden.
        Ik vond het begin van vorig jaar heel spannend, maar toen ik eenmaal bij den GWS werd betrokken waren mijn zorgen weg. Ik heb zoveel leuke mensen ontmoet en heel veel fantastische activiteiten meegemaakt! Bij den GWS zat ik vorig jaar in de jaarboek- en de lustrumcommissie en ik zat in de S-Cape commissie van Kompanio. Verder zit ik vaak hele dagen in de kamer koekjes te eten, spelletjes te spelen en thee te drinken.
        Ik loop nu al iets meer dan twee jaar rond bij De Kindertelefoon en ik heb het ook daar enorm naar mijn zin! Bellen en chatten met kinderen die een luisterend oor nodig hebben en grappig reageren op originele pranks is altijd een geweldig om te doen!
        Ik hou verder erg veel van spelletjes spelen, afspreken met vrienden en heel veel kletsen.

        Ik heb heeeel veel zin in het komende jaar, we gaan er als XXXIe bestuur een feestje van maken! Tot bij de intro, tot bij een activiteit of tot in de kamer!!
        
        Groetjes van Hannah`
    }
];

RECENT_MESSAGES_ELEM.append(...ARTICLES.map(a => new SmartArticle(a.heading, a.body, false, "/")));