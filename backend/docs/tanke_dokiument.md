
# Sammanställning
Struktur i main_stg.stg_dokumentlista (”stg_dokument”) Nedanstående är en koncentrerad, faktabaserad översikt över de fält och principer vi hittills identifierat, hur dokument hänger ihop i processer, och konkreta sätt att använda dessa data för att bygga ett tydligt, spårbart brukargränssnitt för allmänheten.

## Viktigaste fälten och vad de betyder

dok_id — primär dokumentidentifierare (kan vara NULL). Innehåller både dokumentseriekod (tecken 1–4) och dokumentbeteckning (från tecken 5).
doktyp, typ, subtyp — kodade kategorier för dokumentets roll (t.ex. prop, bet, mot, votering, ip, fr, frs, sfs, ds). Används för filtrering och gruppering.
titel, dokumentnamn, dokumentformat — rubrik/visningstext och formatinformation.
beteckning (kan utvinnas ur dok_id) — serieberoende beteckning (t.ex. AU1, A1, sfs-numrering, datumkod för kammaraktiviteter).
dokument_url_html, dokument_url_text, dokumentstatus_url_xml — länkar / plats för fulltext och maskinläsbar status.
organ, tilldelat — vilket utskott/organ som handlägger ärendet.
inlamnad, publicerad, publicerad__v_text, beslutsdag, systemdatum — tidsfält för spårbarhet i processen.
relaterat_id, dokreferens__referens, rel_dok_id — pekare till relaterade dokument (kopplar ärenden över dokumentserier).
filbilaga__fil — bilagor/underlagsfiler (JSON).
debatt__anforande — tal/anföranden i debatt (JSON).
dokintressent__intressent — inblandade politiker/aktörer (JSON) — viktigt för ansvarssökning.
reservationer — textfält med reservationer i betänkanden.
rm — riksdagsår/mandattid (format YYYY/YY) — för periodfiltrering.

## Hur dok_id/parsing används (maskinregler)

Dokumentseriekod = substr(dok_id,1,4). Dokumentbeteckning = substr(dok_id,5).
Tolkning av beteckning beror på serie:
Betänkanden (serie 01) och motioner (serie 02): beteckning = utskottsbeteckning + löpnummer (t.ex. AU1, A1).
Interpellationer, skriftliga frågor, svar, SOU, DS: beteckningen är vanligtvis ett löpnummer (t.ex. 123).
Kammaraktiviteter (serie C1/C2/C4): beteckning = datum + kammerkod (av, bu, ip, vo, osv.) + löpnummer.
Konsekvens: substr-ning av dok_id ger en maskinbarckod som kan länka dokument till utskott, typ och ärendegrupper.

## Vanliga processkedjor (artefakter som skapas)

Proposition → remiss (remissyttranden) → utskott (utskottsmöte, protokoll) → betänkande (bet) + reservationer → kammardebatt (kammakt, t-lista) → votering (votering) → SFS (om lag antas).
Motion → tilldelning till utskott → utskottets handläggning → betänkande eller avslag → kammare → eventuell votering → uppföljning (regeringsproposition, SFS).
Interpellation / skriftlig fråga → svar (frs) → eventuell kammardebatt (ip) → protokoll.
EU-dokument: registrering (KOM/COM), yttranden, eprotokoll/egn protokoll.

## Relationer och hur man följer en kedja i datan

Starta med ett dok_id (unik länk). Hitta rader med relaterat_id eller dokreferens__referens som matchar; följ organ/tilldelat och rm för kontext.
Använd beteckning + utskottskod för att gruppera dokument som hör till samma arbetsflöde (exempel: alla AU* i samma rm).
Dokumentens status & publiceringslänkar (dokumentstatus_url_xml / dokument_url_html) används för att gå till originaltext och verifiera innehåll*

## Konkreta SQL-fragment (kan köras mot main_stg.stg_dokumentlista)

Extrahera serie/beteckning: SELECT dok_id, substr(dok_id,1,4) AS serie, substr(dok_id,5) AS beteckning, doktyp, typ, subtyp, organ, titel FROM main_stg.stg_dokumentlista WHERE dok_id IS NOT NULL LIMIT 200;
Hitta relaterade dokument (kedja): SELECT * FROM main_stg.stg_dokumentlista WHERE dok_id = '' OR relaterat_id = '' OR dokreferens__referens::text LIKE '%%';
Kodnyckel + frekvens (översikt över doktyp): SELECT doktyp, count() AS cnt FROM main_stg.stg_dokumentlista GROUP BY doktyp ORDER BY cnt DESC

## För UX: konkreta datadrivna funktioner och varifrån data hämtas 

Varje funktion nedan anges med vilka fält som levererar innehållet och hur det bör kopplas tekniskt*
Sök + facettering (grundläggande)
Fält: titel, dokumentnamn, doktyp, typ, subtyp, rm, organ, publicerad.
Använd: fri text + facet-filter (doktyp, rm, organ) för att snabbt hitta propositioner, betänkanden, voteringar etc*

## Ärende-/kedjebrowser (följ hela processen)

Fält: dok_id, relaterat_id, dokreferens__referens, beteckning, organ, tilldelat.
Funktion: visa ”ärendeträd” (prop → bet → votering → SFS) med länkar till varje dokument och status*

## Dokumentvisare med provenance (fulltext + metadata)

Fält: dokument_url_html/text, dokumentstatus_url_xml, dokumentformat, publicerad, titel*
Funktion: visa originaltext (HTML/TEXT), länk till maskinläsbar status och bilagor (filbilaga__fil).

## Röstnings-/voteringsvy

Fält: doktyp='votering', debatt__anforande, dokument_url_text/html, dok_id*
Funktion: visa voteringsresultat, vem röstade hur (om data finns), koppla till kammarprotokoll och beslut*

## Politikerprofil + ansvarslänk

Fält: dokintressent__intressent (innehåller intressent-id, namn), relaterade dokument (motionsförfattarskap, reservationer, voteringar).
Funktion: för en viss ledamot visa dokument denne initierat eller kopplats till (motioner, interpellationer, reservationer, voteringar).

##  Tidslinje / händelsekort för ett ärende

Fält: inlamnad, publicerad, beslutsdag, systemdatum, rm.
Funktion: visa steg i ärendets livscykel i kronologisk ordning med aktivitetskoder (kamkod) när relevant.
Reservationer / skiljelinjer

Fält: reservationer, betänkande (doktyp = bet).
Funktion: visa vilka utskottsledamöter reserverade sig mot utskottets förslag (viktigt för ansvar och skild åsikt).
Alerts / push för allmänheten

Fält: doktyp, organ, publicerad, titel.
Funktion: notifiera när t.ex. en proposition publiceras, när betänkande lämnas, när votering är schemalagd/har skett.
Datakvalitet och kontrollpunkter (vad att kontrollera innan public UI)
Kontrollera frekvens av NULL/avvikande dok_id: dok_id kan vara NULL eller ha olika längd/format.
Kontrollera täckning av dokumenttext: dokument_url_text/html kan saknas även om metadata finns.
Verifiera relaterat_id/dokreferens__referens: relationer kan vara inkonsekventa — bygg UX så att relationer visas men inte garanteras fullständiga.
Normalisera kodvärden: vissa koder förekommer både med och utan subtyp eller med tomma strängar — skapa en kodnyckel (codebook) och använd fallback-text vid oklar kod*
Förslag på konkreta leverabler (dataoutputs jag kan skapa åt dig)
Fullständig kodnyckel (CSV/Excel): alla unika doktyp/typ/subtyp + frekvens + ett representativt exempel (dok_id, titel, rm).
SQL-vy med parserade kolumner: skapa vy som innehåller serie, beteckning, kamkod, parsed_datum, canonical_doktyp — underlättar UX-logik.
Valideringsrapport: räkna NULL/ogiltiga dok_id, andel dokument utan textlänk, och exempelrader.
Exempel-ärendekedja: plocka en verklig proposition och visa alla relaterade dokument (prop → remissyttranden → bet → votering → SFS) som en demo*
Snabbcheck-lista för prioriterad UX-implementation (praktiskt, tekniskt)
Implementera parsed-dokid-vy (serie + beteckning + kamkod) → möjliggör utskotts- och datumbaserad gruppering.
Gör kodnyckel tillgänglig i backend och UI (människoläsbara etiketter för doktyp/kamkod).
Visa relationsnoder (relaterat_id) i dokumentvisaren med ”följs av / relaterat till”.
Koppla politiker via dokintressent__intressent för transparens i ansvar (motionsförfattare, reservationer, talare).
Exponera voteringar och protokoll tydligt med logisk länk till beslut och SFS när lag träder i kraft.