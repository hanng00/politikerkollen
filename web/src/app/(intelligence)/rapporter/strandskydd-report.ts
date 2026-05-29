import type { Report } from "./data";

export const strandskyddReport: Report = {
  id: "strandskydd-proposition-2025",
  title: "Strandskyddsreformen",
  subtitle: "Lättnader i strandskyddet – ett första steg (prop. 2024/25:102)",
  date: "2025-07-01",
  vertical: "fastighet",
  iteration: 2,
  summary: "Riksdagen antog regeringens förslag om lättnader i strandskyddet den 15 maj 2025. Lagen träder i kraft 1 juli 2025. En andra, mer omfattande reform är under utredning.",
  keyInsight: "Reformen gick igenom trots 60% folkligt motstånd. Nästa reformvåg väntas 2026.",
  tags: ["strandskydd", "fastighet", "lagändring", "2025"],
  sections: [
    // ══════════════════════════════════════════════════════════════════════
    // EXECUTIVE SUMMARY
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "executive-summary",
      title: "Sammanfattning",
      content: "Riksdagen antog den 15 maj 2025 proposition 2024/25:102 om lättnader i strandskyddet. Lagen träder i kraft 1 juli 2025. Reformen innebär att generellt strandskydd tas bort vid små insjöar (≤1 ha) och smala vattendrag (≤2 m). En andra, mer omfattande utredning startade i juni 2025.",
      data: [
        { label: "Status", value: "Antagen" },
        { label: "Ikraftträdande", value: "1 juli 2025" },
        { label: "Röstning", value: "243 ja, 15 nej, 39 avstår" },
        { label: "Nästa steg", value: "Steg 2-utredning pågår" },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // IMPLIKATIONER
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "implications",
      title: "Vad betyder detta för er?",
      data: [
        { 
          target: "Fastighetsägare & byggherrar",
          implication: "Enklare att bygga vid små sjöar och vattendrag från 1 juli. Kommuner kan nu besluta att upphävt strandskydd inte återinträder vid nya detaljplaner.",
          action: "Inventera mark vid små vattenförekomster. Bevaka kommunala detaljplaneprocesser.",
        },
        {
          target: "Kommuner",
          implication: "Ökad flexibilitet i planprocessen. Länsstyrelsen kan fortfarande införa strandskydd i enskilda fall.",
          action: "Uppdatera översiktsplaner. Förbered rutiner för den nya dispensmöjligheten.",
        },
        {
          target: "Miljöorganisationer",
          implication: "Steg 2-utredningen kan innebära ytterligare lättnader. Opinionen (60% emot) ger argument för motstånd.",
          action: "Bevaka utredningen. Mobilisera inför remissrundan.",
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // TIDSLINJE
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "timeline",
      title: "Tidslinje: Från Tidöavtalet till ikraftträdande",
      data: [
        { date: "2023-12-01", event: "POLITISKT BESLUT", description: "Tidöpartierna enas om strandskyddslättnader", actor: "M, SD, KD, L", source: "Omni" },
        { date: "2025-01-22", event: "LAGRÅDSREMISS", description: "Regeringen presenterar förslaget", actor: "Regeringen", source: "regeringen.se" },
        { date: "2025-02-06", event: "PROPOSITION", description: "Prop. 2024/25:102 överlämnas till riksdagen", actor: "Regeringen", source: "riksdagen.se" },
        { date: "2025-02-07", event: "OPINION", description: "Sifo: 60% emot försvagat strandskydd", actor: "Naturskyddsföreningen", source: "naturskyddsforeningen.se" },
        { date: "2025-02-25", event: "MOTIONER", description: "V och MP lägger följdmotioner", actor: "V, MP", source: "riksdagen.se" },
        { date: "2025-05-08", event: "UTSKOTT", description: "MJU tillstyrker propositionen", actor: "Miljö- och jordbruksutskottet", source: "riksdagen.se" },
        { date: "2025-05-15", event: "BESLUT", description: "Riksdagen antar förslaget (243-15)", actor: "Riksdagen", source: "riksdagen.se" },
        { date: "2025-06-01", event: "UTREDNING", description: "Steg 2-utredning startar", actor: "Regeringen", source: "foretagarna.se" },
        { date: "2025-07-01", event: "IKRAFTTRÄDANDE", description: "Lagen träder i kraft", actor: "-", source: "SFS 2025:XX" },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // RÖSTNING
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "vote-result",
      title: "Röstningsresultat",
      data: [
        { punkt: "1-2", rubrik: "Huvudförslaget", ja: 243, nej: 15, avstar: 39, jaPartier: "M, SD, KD, L, S", nejPartier: "MP", avstarPartier: "C, V" },
      ],
    },
    {
      type: "narrative",
      title: "Analys av röstningen",
      content: "Socialdemokraterna röstade ja trots att 60% av väljarna var emot reformen. Centerpartiet och Vänsterpartiet avstod – ett strategiskt val för att undvika att ta tydlig ställning i en impopulär fråga. Endast Miljöpartiet röstade nej.",
    },

    // ══════════════════════════════════════════════════════════════════════
    // NYCKELAKTÖRER
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "politicians",
      title: "Nyckelaktörer",
      politicians: [
        { name: "Martin Kinnunen", party: "SD", imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/57cbe134-829b-4fb8-9cc1-ce2f1cd02f3b_192.jpg", role: "Ordförande MJU – drev frågan i utskottet" },
        { name: "Rebecka Le Moine", party: "MP", imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/67e327d0-b2ca-47eb-802a-c140187f0e0c_192.jpg", role: "Ledande kritiker – varnade för allemansrätten" },
        { name: "Romina Pourmokhtari", party: "L", imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/1009b507-a1ca-4f1c-924d-4c2edd3c9c7d_192.jpg", role: "Klimat- och miljöminister – ansvarig för propositionen" },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // INTRESSENTANALYS
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "table",
      title: "Intressenternas positioner",
      data: [
        { Intressent: "Företagarna", Position: "Starkt för", Argument: "Efterlyser ytterligare lättnader", Källa: "foretagarna.se" },
        { Intressent: "LRF", Position: "För", Argument: "Stöder undantag för areella näringar", Källa: "lrf.se" },
        { Intressent: "Naturskyddsföreningen", Position: "Starkt emot", Argument: "5-10% av Sveriges natur blir skyddslös", Källa: "naturskyddsforeningen.se" },
        { Intressent: "Naturvårdsverket", Position: "Delvis för", Argument: "Tillstyrker med reservationer", Källa: "naturvardsverket.se" },
        { Intressent: "SKR", Position: "Neutral", Argument: "Vill ha tydligare vägledning", Källa: "skr.se" },
        { Intressent: "Birdlife Sverige", Position: "Emot", Argument: "Hotar biologisk mångfald", Källa: "birdlife.se" },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // OPINIONSDATA
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "callout",
      title: "Opinionsläget",
      content: "En Sifo-undersökning (februari 2025, n=3000) visade att 60% av svenska folket var emot försvagat strandskydd. Endast 22% var positiva. 75% ville se förstärkt skydd vid kuster och större tätorter.",
      highlight: "warning",
    },

    // ══════════════════════════════════════════════════════════════════════
    // FRAMÅTBLICK
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "callout",
      title: "Vad händer nu?",
      content: "En mer omfattande utredning om strandskyddsreformer startade i juni 2025. Fokus ligger på hur det ska bli ännu lättare att bygga nära vatten och hur kommunernas roll kan ökas. Utredningen väntas presenteras under 2026.",
      highlight: "opportunity",
    },

    // ══════════════════════════════════════════════════════════════════════
    // KÄLLOR
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "table",
      title: "Källor",
      data: [
        { Dokument: "Prop. 2024/25:102", Typ: "Proposition", URL: "riksdagen.se/sv/dokument-och-lagar/dokument/proposition/lattnader-i-strandskyddet-ett-forsta-steg_hc03102" },
        { Dokument: "Betänkande 2024/25:MJU16", Typ: "Utskottsbetänkande", URL: "riksdagen.se/sv/dokument-och-lagar/dokument/betankande/lattnader-i-strandskyddet-ett-forsta-steg_hc01mju16" },
        { Dokument: "Omröstning MJU16", Typ: "Voteringsprotokoll", URL: "riksdagen.se/sv/dokument-och-lagar/dokument/omrostning/omrostning-betankande-202425mju16" },
        { Dokument: "Sifo-undersökning", Typ: "Opinionsdata", URL: "naturskyddsforeningen.se/artiklar/6-av-10-svenskar-emot-en-forsvagning-av-strandskyddet" },
        { Dokument: "Remissvar SNF", Typ: "Remissvar", URL: "cdn.naturskyddsforeningen.se/uploads/2025/02/Vem-tjanar-pa-forsvagat-strandskydd.pdf" },
        { Dokument: "Företagarnas ställningstagande", Typ: "Pressmeddelande", URL: "foretagarna.se/nyheter/riks/2025/maj/valkommet-beslut-om-mindre-stelbent-strandskydd" },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // METODIK
    // ══════════════════════════════════════════════════════════════════════
    {
      type: "methodology",
      title: "Hur denna rapport togs fram",
      content: "Denna rapport kombinerar automatiserad analys av riksdagsdata med manuell research av externa källor. Riksdagsdata (propositioner, motioner, voteringar, anföranden) hämtades via Riksdagens öppna API och analyserades med hjälp av AI-modeller för att identifiera nyckelaktörer och spåra lagstiftningskedjan. Externa källor (remissvar, opinionsundersökningar, pressmeddelanden) identifierades genom webbsökningar och verifierades manuellt. Rapporten skrevs i dialog mellan människa och AI (Claude) den 18 mars 2026, med fokus på att skapa ett format som är användbart för Public Affairs-proffs.",
      data: [
        { steg: "1. Datainsamling", beskrivning: "Riksdagsdata via öppna API:er, externa källor via webbsökning" },
        { steg: "2. Analys", beskrivning: "AI-assisterad identifiering av nyckelaktörer, tidslinje, röstmönster" },
        { steg: "3. Kontextualisering", beskrivning: "Manuell research av remissvar, opinionsdata, lobbyaktivitet" },
        { steg: "4. Syntes", beskrivning: "Sammanställning med fokus på implikationer och handlingsrekommendationer" },
      ],
    },
  ],
};
