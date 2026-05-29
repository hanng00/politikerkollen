import type { Report } from "./data";

export const energiReport: Report = {
  id: "energipolitik-prediktion-2026",
  title: "Kärnkraftsfinansieringen: Regeringen vann — men S visade pragmatism",
  subtitle:
    "Tre rösters marginal på huvudförslaget. Bred enighet på tekniska frågor. Vad betyder det för kommande beslut?",
  date: "2026-03-18",
  vertical: "energi",
  iteration: 3,
  summary:
    "Riksdagen antog kärnkraftsfinansieringen med 154-151. Men på punkt 3 röstade S och C ja tillsammans med regeringen (255-36). Denna dolda enighet är nyckeln till att förstå kommande energibeslut.",
  keyInsight:
    "S röstade nej på principfrågan men ja på tekniska detaljer — 80 av 93 S-ledamöter stödde punkt 3. Detta mönster kan upprepas på HD01NU17 (Elmarknadsfrågor).",
  predictionMade:
    "2026-03-18: HD01NU13 går igenom med regeringsmajoritet. HD01NU17 kan få bredare stöd om S väljer pragmatism.",
  tags: ["energi", "kärnkraft", "elmarknad", "prediktion", "pending"],
  sections: [
    // ════════════════════════════════════════════════════════════════════════
    // PYRAMID LEVEL 1: HUVUDBUDSKAP (Governing Thought)
    // ════════════════════════════════════════════════════════════════════════
    {
      type: "executive-summary",
      title: "Huvudbudskap",
      content:
        "Kärnkraftsfinansieringen gick igenom med knapp marginal (154-151), men röstmönstret avslöjar en dold pragmatism hos S som kan påverka kommande energibeslut. På punkt 3 röstade 80 av 93 S-ledamöter ja tillsammans med regeringen — ett mönster som kan upprepas på elmarknadsfrågor (HD01NU17) under Q2 2026.",
      data: [
        { label: "Huvudförslaget (punkt 1)", value: "154-151 — Regeringen vann" },
        {
          label: "Teknisk fråga (punkt 3)",
          value: "255-36 — S och C röstade ja",
        },
        { label: "Kommande beslut", value: "HD01NU13, NU16, NU17 väntar Q2" },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // PYRAMID LEVEL 2: TRE STÖDJANDE ARGUMENT
    // ════════════════════════════════════════════════════════════════════════

    // ARGUMENT 1: Vad hände?
    {
      type: "callout",
      title: "Vad hände: Röstningen avslöjar nyanserna",
      content:
        "Betänkande 2024/25:NU20 hade fyra omröstningspunkter. Huvudförslaget var jämnt, men på tekniska frågor fanns bred enighet. Detta är avgörande för att förstå framtida röstmönster.",
      highlight: "opportunity",
    },
    {
      type: "vote-result",
      title: "Röstningsresultat: Betänkande 2024/25:NU20 (21 maj 2025)",
      data: [
        {
          punkt: "1",
          rubrik: "Statligt stöd för ny kärnkraft (huvudförslaget)",
          ja: 154,
          nej: 151,
          avstar: 0,
          jaPartier: "M (60), SD (63), KD (16), L (14)",
          nejPartier: "S (93), C (21), V (21), MP (15)",
        },
        {
          punkt: "2",
          rubrik: "Avslag på alternativa förslag",
          ja: 154,
          nej: 15,
          avstar: 136,
          jaPartier: "M, SD, KD, L",
          nejPartier: "MP (15)",
          avstarPartier: "S (93), C (21), V (21)",
        },
        {
          punkt: "3",
          rubrik: "Utskottets förslag i övrigt",
          ja: 255,
          nej: 36,
          avstar: 14,
          jaPartier: "M (60), SD (63), KD (16), L (14), S (80), C (21)",
          nejPartier: "MP (15), V (21)",
          avstarPartier: "S (13)",
        },
        {
          punkt: "4",
          rubrik: "Avslag på S-reservation om marknadsprinciper",
          ja: 154,
          nej: 94,
          avstar: 57,
          jaPartier: "M, SD, KD, L",
          nejPartier: "S (93)",
          avstarPartier: "C (21), MP (15), V (21)",
        },
      ],
    },
    {
      type: "narrative",
      title: "Nyckelinsikt: S:s splittrade röstning",
      content:
        "På punkt 3 röstade 80 av 93 S-ledamöter ja — tillsammans med regeringspartierna och C. Endast 13 S-ledamöter avstod. Detta visar att S är villiga att stödja tekniska och administrativa aspekter av energipolitiken, även när de motsätter sig principfrågan. Mönstret är viktigt för att förstå hur S kan agera på kommande elmarknadsfrågor.",
    },

    // ARGUMENT 2: Varför det spelar roll
    {
      type: "callout",
      title: "Varför det spelar roll: Tre beslut väntar",
      content:
        "Tre energipolitiska betänkanden från Näringsutskottet väntar på beslut under Q2 2026. Baserat på röstmönstret från NU20 kan vi förutse utfallen.",
      highlight: "opportunity",
    },
    {
      type: "table",
      title: "Kommande beslut och vår bedömning",
      data: [
        {
          Betänkande: "HD01NU13",
          Titel: "Energipolitik",
          Bedömning: "Regeringen vinner (154-151)",
          Grund: "Samma blockindelning som NU20 punkt 1",
        },
        {
          Betänkande: "HD01NU17",
          Titel: "Elmarknadsfrågor",
          Bedömning: "Möjlig bred majoritet",
          Grund: "EU-anpassning — S kan rösta ja som på NU20 punkt 3",
        },
        {
          Betänkande: "HD01NU16",
          Titel: "Mineralpolitik",
          Bedömning: "Regeringen vinner (154-151)",
          Grund: "Uranförbudet redan borttaget (HD01NU7)",
        },
      ],
    },
    {
      type: "narrative",
      title: "HD01NU17 är nyckeln att bevaka",
      content:
        "Elmarknadsfrågor (HD01NU17) handlar primärt om EU-anpassning av elmarknadsdesignen — inte om kärnkraft specifikt. Om S bedömer att frågan är teknisk snarare än ideologisk, kan de välja att rösta ja eller avstå, precis som på punkt 3 i NU20. Detta skulle ge en bred majoritet och signalera konstruktivitet inför valet 2026.",
    },

    // ARGUMENT 3: Vad det betyder för er
    {
      type: "callout",
      title: "Vad det betyder: Implikationer per aktör",
      content:
        "Beroende på er position i energisektorn har beslutet olika konsekvenser. Här är vår bedömning av vad ni bör bevaka.",
      highlight: "opportunity",
    },
    {
      type: "implications",
      title: "Implikationer per aktörstyp",
      data: [
        {
          target: "Kärnkraftsbolag",
          implication:
            "Statliga lån och prisdifferenskontrakt (CfD) är nu tillgängliga. Lagen träder i kraft 1 augusti 2025.",
          action:
            "Påbörja dialog med Finansdepartementet om avtalsvillkor. Bevaka HD01NU13 för signaler om ambitionsnivå.",
        },
        {
          target: "Vindkraftsbolag",
          implication:
            "Investeringstakten har redan minskat — 446 MW beslutades 2024 jämfört med 1,2 GW 2023 (Svensk Vindenergi).",
          action:
            "Bevaka HD01NU13 och eventuell vindkraftsskatt. Delta i remissprocesser.",
        },
        {
          target: "Elnätsbolag",
          implication:
            "HD01NU17 kan påverka nättariffer och incitament för nätinvesteringar.",
          action:
            "Analysera EU:s elmarknadsdesign. Förbered för svenska anpassningar.",
        },
        {
          target: "Storförbrukare (industri)",
          implication:
            "Långsiktig planerbarhet ökar. Elanvändningen väntas öka från 140 till 290 TWh till 2050 (Svenskt Näringsliv).",
          action:
            "Inkludera kärnkraftsscenariot i långsiktiga elavtal. Bevaka HD01NU16 för batteriråvaror.",
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // PYRAMID LEVEL 3: STÖDJANDE DETALJER
    // ════════════════════════════════════════════════════════════════════════

    {
      type: "timeline",
      title: "Tidslinje: Från Tidöavtalet till kommande beslut",
      data: [
        {
          date: "2022-10-14",
          event: "POLITISKT BESLUT",
          description: "Tidöavtalet: 'Ny kärnkraft ska möjliggöras'",
          actor: "M, SD, KD, L",
          source: "regeringen.se",
        },
        {
          date: "2023-01-01",
          event: "LAGÄNDRING",
          description: "Förbudet mot nya reaktorer upphävs",
          actor: "Riksdagen",
          source: "riksdagen.se",
        },
        {
          date: "2024-11-05",
          event: "UTREDNING",
          description: "Finansieringsutredningen presenteras",
          actor: "Regeringen",
          source: "regeringen.se",
        },
        {
          date: "2025-03-27",
          event: "PROPOSITION",
          description: "Prop. 2024/25:150 om statligt stöd",
          actor: "Regeringen",
          source: "riksdagen.se",
        },
        {
          date: "2025-05-21",
          event: "BESLUT",
          description: "Riksdagen antar förslaget (154-151)",
          actor: "Riksdagen",
          source: "riksdagen.se",
        },
        {
          date: "2025-08-01",
          event: "IKRAFTTRÄDANDE",
          description: "Lagen om statligt stöd träder i kraft",
          actor: "Regeringen",
          source: "riksdagen.se",
        },
        {
          date: "2025-11-11",
          event: "BETÄNKANDE",
          description: "HD01NU13, NU16, NU17 publiceras",
          actor: "Näringsutskottet",
          source: "riksdagen.se",
        },
        {
          date: "2026-Q2",
          event: "VÄNTAR",
          description: "Omröstning om HD01NU13, NU16, NU17",
          actor: "Riksdagen",
          source: "Bedömning",
        },
      ],
    },

    {
      type: "politicians",
      title: "Nyckelaktörer i debatten (21 maj 2025)",
      politicians: [
        {
          name: "Tobias Andersson",
          party: "SD",
          imageUrl:
            "https://data.riksdagen.se/filarkiv/bilder/ledamot/0217932b-600a-4e27-ba09-1cf9913b0695_192.jpg",
          role: "Ordförande Näringsutskottet — 14 anföranden i debatten",
        },
        {
          name: "Fredrik Olovsson",
          party: "S",
          imageUrl:
            "https://data.riksdagen.se/filarkiv/bilder/ledamot/bc5c4354-fca3-4071-8096-acd9b7b1d09a_192.jpg",
          role: "S:s energipolitiske talesperson — 12 anföranden",
        },
        {
          name: "Rickard Nordin",
          party: "C",
          imageUrl:
            "https://data.riksdagen.se/filarkiv/bilder/ledamot/a57d39bb-9f60-4def-ab90-97791ec56447_192.jpg",
          role: "C:s energitalesperson — 11 anföranden",
        },
        {
          name: "Birger Lahti",
          party: "V",
          imageUrl:
            "https://data.riksdagen.se/filarkiv/bilder/ledamot/a2c4e9f3-6d4a-4994-9351-66ce4c752905_192.jpg",
          role: "V:s talesperson — 11 anföranden",
        },
      ],
    },

    {
      type: "quotes",
      title: "Röster från debatten",
      data: [
        {
          date: "2025-05-21",
          politician: "Birger Lahti",
          party: "V",
          context:
            "I dag ska jag ha den viktigaste debatten jag haft i riksdagen under min tid. Debatten handlar om finansiering och riskdelning av investeringar i ny kärnkraft.",
          source: "Riksdagens protokoll 2024/25:120",
        },
        {
          date: "2025-05-21",
          politician: "Fredrik Olovsson",
          party: "S",
          context:
            "Vi får många rapporter om att ny energiproduktion i Sverige tvärstoppas. Man fattar inte nya investeringsbeslut.",
          source: "Riksdagens protokoll 2024/25:120",
        },
        {
          date: "2025-05-21",
          politician: "Rickard Nordin",
          party: "C",
          context:
            "Jag ser en majoritet för stärkt vattenkraft, effektökningar, pumpkraft — mycket mer kostnadseffektivt än regeringens kärnkraftsförslag.",
          source: "Riksdagens protokoll 2024/25:120",
        },
        {
          date: "2025-05-21",
          politician: "Tobias Andersson",
          party: "SD",
          context:
            "Oavsett om det rör sig om väg, el eller energiinfrastruktur finns det stora risker — men vi måste skydda det system som blivit så eftersatt.",
          source: "Riksdagens protokoll 2024/25:120",
        },
      ],
    },

    {
      type: "stakeholders",
      title: "Intressenternas positioner",
      data: [
        {
          name: "Svenskt Näringsliv",
          position: "for",
          positionLabel: "Starkt för",
          argument:
            "Planerbar el avgörande för industrins konkurrenskraft. Elanvändningen väntas öka till 290 TWh 2050.",
          source: "svensktnaringsliv.se, 2025-04",
          url: "https://svensktnaringsliv.se/sakomraden/hallbarhet-miljo-och-energi/valkommet-besked-om-karnkraftsfinansiering_1229834.html",
        },
        {
          name: "Energiföretagen",
          position: "for",
          positionLabel: "För",
          argument:
            "Välkomnar att staten tar ansvar. CfD-modellen prövad i andra länder och godkänd av EU-kommissionen.",
          source: "energiforetagen.se, 2025-03-27",
          url: "https://energiforetagen.se/pressrum/nyheter/2025/mars/positivt-med-forslag-om-finansieringsmodell-for-ny-karnkraft/",
        },
        {
          name: "Svensk Vindenergi",
          position: "critical",
          positionLabel: "Kritisk",
          argument:
            "Riskerar att minska investeringsviljan i andra kraftslag. Investeringstakten redan ned från 1,2 GW (2023) till 446 MW (2024).",
          source: "svenskvindenergi.org, 2025-03",
          url: "https://svenskvindenergi.org/kommentar/vind-och-solbranschen-om-forslag-till-finansiering-och-riskdelning-i-ny-karnkraft",
        },
        {
          name: "Naturskyddsföreningen",
          position: "against",
          positionLabel: "Emot",
          argument:
            "Kärnkraftsfokus kan ge 220 miljoner ton högre CO2-utsläpp till 2045 jämfört med förnybart.",
          source: "naturskyddsforeningen.se, 2025",
          url: "https://naturskyddsforeningen.se/artiklar/karnkraftsfallan-hogre-utslapp-i-vantan-pa-ny-karnkraft/",
        },
        {
          name: "LO",
          position: "critical",
          positionLabel: "Kritisk med förbehåll",
          argument:
            "Om kärnkraft byggs med statliga subventioner bör den ägas offentligt. Efterfrågar samhällsekonomisk granskning.",
          source: "lo.se, 2024-11",
          url: "https://lo.se/start/lo_fakta/los_yttrande_over_finansiering_och_riskdelning_vid_investeringar_i_ny_karnkraft",
        },
        {
          name: "Greenpeace",
          position: "against",
          positionLabel: "Starkt emot",
          argument:
            "Kallar det 'ett av de största ekonomiska stöden till enskilda företag i Sveriges historia'. Pekar på kostnadsökningar i Finland, Frankrike, UK.",
          source: "greenpeace.org/sweden, 2025",
          url: "https://greenpeace.org/sweden/pressmeddelanden/klimat/miljardsubventioner-till-karnkraft-blir-ett-massivt-slukhal/",
        },
      ],
    },

    {
      type: "chart",
      title: "Historiska röstmönster i Näringsutskottet (2025)",
      chartType: "bar",
      data: [
        { parti: "M", jaFrekvens: 86, nejFrekvens: 1 },
        { parti: "KD", jaFrekvens: 82, nejFrekvens: 1 },
        { parti: "L", jaFrekvens: 81, nejFrekvens: 1 },
        { parti: "SD", jaFrekvens: 55, nejFrekvens: 15 },
        { parti: "S", jaFrekvens: 34, nejFrekvens: 31 },
        { parti: "C", jaFrekvens: 30, nejFrekvens: 18 },
        { parti: "MP", jaFrekvens: 22, nejFrekvens: 28 },
        { parti: "V", jaFrekvens: 17, nejFrekvens: 33 },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // METODIK OCH KÄLLOR
    // ════════════════════════════════════════════════════════════════════════

    {
      type: "methodology",
      title: "Metodik",
      content:
        "Denna rapport bygger på primärdata från riksdagens öppna API:er. Voteringsdata hämtades direkt från stg_voteringlista och aggregerades per parti och punkt. Anföranden analyserades via mart_person_timeline. Intressentpositioner verifierades mot publicerade remissvar och pressmeddelanden.",
      data: [
        {
          steg: "1. Voteringsdata",
          beskrivning:
            "Hämtade alla röster för HC01NU20 från riksdagens API. Totalt 305 röstande ledamöter per punkt.",
        },
        {
          steg: "2. Debattanalys",
          beskrivning:
            "Analyserade 88 anföranden från debatten 21 maj 2025. Identifierade nyckeltalare per parti.",
        },
        {
          steg: "3. Intressentverifiering",
          beskrivning:
            "Verifierade varje intressentposition mot publicerade remissvar och pressmeddelanden med datum och URL.",
        },
        {
          steg: "4. Mönsteranalys",
          beskrivning:
            "Jämförde röstmönster mellan punkter för att identifiera pragmatism vs principiellt motstånd.",
        },
      ],
    },

    {
      type: "table",
      title: "Primärkällor",
      data: [
        {
          Dokument: "Proposition 2024/25:150",
          Typ: "Proposition",
          Datum: "2025-03-27",
          URL: "riksdagen.se/sv/dokument-och-lagar/dokument/proposition/finansiering-och-riskdelning-vid-investeringar-i_hc03150",
        },
        {
          Dokument: "Betänkande 2024/25:NU20",
          Typ: "Utskottsbetänkande",
          Datum: "2025-05-16",
          URL: "riksdagen.se/sv/dokument-och-lagar/dokument/betankande/finansiering-och-riskdelning-vid-investeringar-i_hc01nu20",
        },
        {
          Dokument: "Protokoll 2024/25:120",
          Typ: "Kammarprotokoll",
          Datum: "2025-05-21",
          URL: "riksdagen.se/sv/dokument-och-lagar/dokument/protokoll/protokoll-202425120-onsdagen-den-21-maj_hc09120",
        },
        {
          Dokument: "Voteringsdata HC01NU20",
          Typ: "API-data",
          Datum: "2025-05-21",
          URL: "data.riksdagen.se (stg_voteringlista)",
        },
      ],
    },

    {
      type: "callout",
      title: "Uppföljning",
      content:
        "Denna rapport uppdateras när HD01NU13, HD01NU16 och HD01NU17 går till omröstning. Vår bedömning valideras då mot faktiskt utfall.",
      highlight: "prediction-correct",
    },
  ],
};
