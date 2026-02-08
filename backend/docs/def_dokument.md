# Översikt (kort)

Tabellen du tittar på är main_stg.stg_dokumentlista. Den innehåller metadata för många slags riksdags- och regeringsdokument. Fälten doktyp, typ och subtyp kodar vilken slags dokument varje rad är; övriga fält (dok_id, titel, rm, organ, inlamnad, tilldelat, relaterat_id, dokumentstatus_url_xml osv.) används för att identifiera och länka dokument i arbetsflödet.
Nedan förklarar jag de huvudsakliga dokumentgrupperna som finns i datan, hur de förhåller sig till varandra i en typisk handläggningskedja, och vilka fält i tabellen som visar relationer mellan dokument.

## Vanliga dokumenttyper och korta definitioner (fakta)

mot (motion) — förslag från riksdagsledamot(er). I subtyp finns t.ex. "Enskild motion", "Kommittémotion", "Partimotion".
prop (proposition) — regeringens propositioner (lagförslag och större förslag till riksdagen).
bet (betänkande) — utskottens betänkanden (utskottsrapport till riksdagen), ofta innehåller reservationer.
votering — röstningspost / votering i kammaren (t.ex. huvudvotering). Innehåller resultat och länk till vilka som röstade hur.
prot / uprotokoll / utskottsdokument — protokoll från plenums- eller utskottsmöten; utskottsdokument omfattar protokoll, särskilda protokoll mm.
utskottsmöte — dokument relaterade till utskottsmöten (agendor, kallelser, sammanträden).
kammakt — handlingar knutna till kammarens arbete (subtyper i datasetet inkluderar t.ex. ip, vo, ap — se notering nedan).
sfs — publicerade lagar i Svensk författningssamling (SFS).
sou — Statens offentliga utredningar.
ds — Departementsserien (Ds) (regeringens rapporter från departement).
eu-dokument / eunbil / eprotokoll — dokument relaterade till EU (dels bilagor, dels protokoll).
fr, frs — förekommer ofta i datasetet som separata koder. Datasetet innehåller dessa koder men tabellen innehåller ingen inbyggd textglossarium som entydigt förklarar varje kortkod i alla fall; jag kan visa kontextexempel om du vill.

## Typisk handläggningskedja (hur dokument hänger ihop)

### Inlämning / initiativ

En motion (mot) inlämnas av en ledamot: fälten inlamnad och dok_id visar tid och identifierare.
Regeringen lägger fram en proposition (prop) eller en utredning publiceras som SOU/DS.
### Remiss / hänvisning till utskott

Motioner och propositioner tilldelas ett utskott (fältet tilldelat / organ).
Hänvisning och relaterade dokument kopplas via relaterat_id eller dokreferens__referens.
### Utskottets arbete

Utskottet håller utskottsmöten och skapar utskottsdokument (utskottsmöte, uprotokoll, bet). Dessa dokument blir betänkanden (bet) eller särskilda protokoll (kusprot).
I betänkandet redovisas förslag, motiveringar och eventuella reservationer (fält reservationer finns).
### Kammardebatt och beslut

Betänkandet går till kammaren; kammaren kan föra kammakt-dokument (kammakt) och slutligen hålls en votering (votering) där beslut registreras.
Resultatet och protokoll förs in i prot / protokoll (fält prot, protokollstyper).
### Efter beslut: lagföring / publicering

Om beslut leder till lag utfärdas SFS (sfs) och publiceras i Svensk författningssamling. Dokumentformat och beteckning/nummer anger ofta formell beteckning.
Dokumentens publiceringsstatus kan följas via dokumentstatus_url_xml och publicerad/publicerad__v_text.
### Hur tabellen visar relationer tekniskt

dok_id — primär identifierare för ett dokument; används för att direkt hämta dokumenttext/länk.
relaterat_id / rel_dok_id / dokreferens__referens — pekar på andra dokument som är relaterade (t.ex. en motion och dess utskottsbetänkande eller en proposition och dess kammakt).
organ / tilldelat — anger vilket utskott eller organ som handlägger dokumentet.
inlamnad, publicerad, systemdatum, beslutad — tidsfält som visar var i processen dokumentet befinner sig.
doktyp, typ, subtyp — kodade kategorier; tillsammans ger de både en kortkod och en mer läsbar underkategori.
dokument_url_text / dokument_url_html / dokumentstatus_url_xml — länkar till dokumentets innehåll/status i Riksdagens publiceringssystem.
### Särskilda noteringar / osäkerheter i datasetet

Tabellens kodvärden är korta koder; datasetet innehåller inte alltid en mänsklig förklarande text för varje kortkod. Vissa koder förekommer tomma/null.
För några korta koder i tabellen (t.ex. fr, frs, vissa kam-xx-koder) finns inte en entydig förklaring i metadata här. Jag kan ta fram exempelrader för en kod så man ser kontext (titel, titeltext, organ, subtyp) vilket ofta gör betydelsen klar.