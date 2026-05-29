import type { Report } from "./data";

export const energiReportV2: Report = {
  id: "energipolitik-pyramid-2026",
  title: "S:s dolda pragmatism öppnar för bred energimajoritet",
  subtitle:
    "80 av 93 S-ledamöter röstade ja på tekniska frågor. Samma mönster kan ge HD01NU17 bredare stöd än väntat.",
  date: "2026-03-18",
  vertical: "energi",
  iteration: 4,
  summary:
    "Kärnkraftsfinansieringen antogs med 154-151, men den verkliga nyheten är S:s beteende på punkt 3: 80 av 93 röstade ja. Detta pragmatiska mönster kan upprepas på HD01NU17.",
  keyInsight:
    "S skiljer på principfrågor och tekniska frågor. På HD01NU17 (EU-anpassning) kan de välja pragmatism igen.",
  predictionMade:
    "2026-03-18: HD01NU17 får bredare stöd än HD01NU13 om S ser det som tekniskt snarare än ideologiskt.",
  tags: ["energi", "kärnkraft", "elmarknad", "prediktion", "pyramid"],
  sections: [
    // ════════════════════════════════════════════════════════════════════════
    // DEL 1: EXECUTIVE SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    {
      type: "executive-summary-v2",
      title: "Sammanfattning",
      content:
        "Den 21 maj 2025 antog riksdagen kärnkraftsfinansieringen med knapp marginal (154-151). Men röstmönstret avslöjar något oväntat: på tekniska frågor röstade 80 av 93 S-ledamöter ja tillsammans med regeringen. Detta mönster kan upprepas. HD01NU17 (Elmarknadsfrågor) handlar om EU-anpassning — inte kärnkraft. Om S ser det som tekniskt snarare än ideologiskt, kan de rösta ja igen.",
      data: [
        { label: "Huvudförslaget", value: "154-151", subtext: "Knapp marginal" },
        { label: "Teknisk fråga (punkt 3)", value: "255-36", subtext: "Bred enighet" },
        { label: "S-ledamöter ja på punkt 3", value: "80 av 93", subtext: "86% pragmatism" },
      ],
      implications: [
        {
          target: "Kärnkraftsbolag",
          action: "Finansieringsmodellen är på plats. Börja förhandla avtalsvillkor med Finansdepartementet.",
        },
        {
          target: "Vindkraftsbolag",
          action: "Investeringstakten har halverats. Delta aktivt i remissprocesser för att påverka villkoren.",
        },
        {
          target: "Elnätsbolag",
          action: "HD01NU17 kan påverka nättariffer. Analysera EU:s elmarknadsdesign nu.",
        },
        {
          target: "Storförbrukare",
          action: "Planerbarheten ökar. Uppdatera era långsiktiga elavtal med kärnkraftsscenariot.",
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // DEL 2: STORYN (Pyramid Principle)
    // ════════════════════════════════════════════════════════════════════════
    {
      type: "divider",
      title: "Analysen",
    },

    // ARGUMENT 1: S skiljer på princip och teknik
    {
      type: "pyramid-section",
      actionTitle: "S röstade nej på principen men ja på detaljerna — ett medvetet val",
      supportingFacts: [
        "På punkt 1 (huvudförslaget) röstade alla 93 S-ledamöter nej — en tydlig principmarkering mot statlig kärnkraftsfinansiering",
        "På punkt 3 (utskottets övriga förslag) röstade 80 S-ledamöter ja, endast 13 avstod — ingen röstade nej",
        "Detta är inte slump: S valde aktivt att stödja tekniska och administrativa aspekter, även när de motsatte sig principfrågan",
      ],
      evidence: [
        {
          type: "vote-comparison",
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
              punkt: "3",
              rubrik: "Utskottets förslag i övrigt (tekniska detaljer)",
              ja: 255,
              nej: 36,
              avstar: 14,
              jaPartier: "M (60), SD (63), KD (16), L (14), S (80), C (21)",
              nejPartier: "MP (15), V (21)",
              avstarPartier: "S (13)",
            },
          ],
        },
        {
          type: "quotes",
          data: [
            {
              politician: "Birger Lahti",
              party: "V",
              context: "I dag ska jag ha den viktigaste debatten jag haft i riksdagen under min tid. Debatten handlar om finansiering och riskdelning av investeringar i ny kärnkraft.",
              date: "2025-05-21",
              imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/a2c4e9f3-6d4a-4994-9351-66ce4c752905_192.jpg",
            },
          ],
        },
      ],
      takeaway: "S har etablerat ett mönster: nej på ideologi, ja på pragmatik. Använd detta i er analys av kommande beslut.",
    },

    // ARGUMENT 2: HD01NU17 passar mönstret
    {
      type: "pyramid-section",
      actionTitle: "HD01NU17 handlar om EU-anpassning — inte kärnkraft. S kan rösta ja.",
      supportingFacts: [
        "HD01NU17 (Elmarknadsfrågor) fokuserar på EU:s elmarknadsdesign — teknisk anpassning av svenska regler till EU-direktiv",
        "HD01NU13 (Energipolitik) är en principfråga om kärnkraftens roll — förvänta samma blockindelning som punkt 1 (154-151)",
        "HD01NU16 (Mineralpolitik) är redan avgjord i praktiken — uranförbudet borttaget via HD01NU7 i november 2025",
      ],
      evidence: [
        {
          type: "prediction-table",
          data: [
            {
              betankande: "HD01NU13",
              titel: "Energipolitik",
              karaktar: "Principfråga",
              prediktion: "154-151 (regeringen vinner)",
              konfidens: "Hög",
            },
            {
              betankande: "HD01NU17",
              titel: "Elmarknadsfrågor",
              karaktar: "Teknisk EU-anpassning",
              prediktion: "Möjlig bred majoritet",
              konfidens: "Medel",
            },
            {
              betankande: "HD01NU16",
              titel: "Mineralpolitik",
              karaktar: "Redan avgjord",
              prediktion: "154-151 (regeringen vinner)",
              konfidens: "Hög",
            },
          ],
        },
        {
          type: "quotes",
          data: [
            {
              politician: "Rickard Nordin",
              party: "C",
              context: "Jag ser en majoritet för stärkt vattenkraft, effektökningar, pumpkraft — mycket mer kostnadseffektivt än regeringens kärnkraftsförslag.",
              date: "2025-05-21",
              imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/a57d39bb-9f60-4def-ab90-97791ec56447_192.jpg",
            },
          ],
        },
      ],
      takeaway: "Fokusera er bevakning på HD01NU17. Det är där överraskningar kan ske — och där S:s pragmatism kan göra skillnad.",
    },

    // ARGUMENT 3: Varför S agerar så här — med intressenter som förklarar kontexten
    {
      type: "pyramid-section",
      actionTitle: "S balanserar mellan industri och miljörörelse — pragmatism är strategin",
      supportingFacts: [
        "Svenskt Näringsliv och Energiföretagen trycker på för kärnkraft — S kan inte ignorera industrins behov",
        "LO, Naturskyddsföreningen och Greenpeace är kritiska — S:s kärnväljare finns här",
        "Lösningen: rösta nej på principen (behåll miljöprofilen), ja på tekniska frågor (visa konstruktivitet mot industrin)",
      ],
      evidence: [
        {
          type: "stakeholders",
          data: [
            {
              name: "Svenskt Näringsliv",
              position: "for",
              positionLabel: "Starkt för",
              argument: "Planerbar el avgörande för industrins konkurrenskraft. Elanvändningen väntas öka till 290 TWh 2050.",
              source: "svensktnaringsliv.se, 2025-04",
              url: "https://svensktnaringsliv.se/sakomraden/hallbarhet-miljo-och-energi/valkommet-besked-om-karnkraftsfinansiering_1229834.html",
            },
            {
              name: "Energiföretagen",
              position: "for",
              positionLabel: "För",
              argument: "Välkomnar att staten tar ansvar. CfD-modellen prövad i andra länder och godkänd av EU-kommissionen.",
              source: "energiforetagen.se, 2025-03-27",
              url: "https://energiforetagen.se/pressrum/nyheter/2025/mars/positivt-med-forslag-om-finansieringsmodell-for-ny-karnkraft/",
            },
            {
              name: "LO",
              position: "critical",
              positionLabel: "Kritisk med förbehåll",
              argument: "Om kärnkraft byggs med statliga subventioner bör den ägas offentligt. Efterfrågar samhällsekonomisk granskning.",
              source: "lo.se, 2024-11",
              url: "https://lo.se/start/lo_fakta/los_yttrande_over_finansiering_och_riskdelning_vid_investeringar_i_ny_karnkraft",
            },
            {
              name: "Naturskyddsföreningen",
              position: "against",
              positionLabel: "Emot",
              argument: "Kärnkraftsfokus kan ge 220 miljoner ton högre CO2-utsläpp till 2045 jämfört med förnybart.",
              source: "naturskyddsforeningen.se, 2025",
              url: "https://naturskyddsforeningen.se/artiklar/karnkraftsfallan-hogre-utslapp-i-vantan-pa-ny-karnkraft/",
            },
          ],
        },
        {
          type: "quotes",
          data: [
            {
              politician: "Fredrik Olovsson",
              party: "S",
              context: "Vi får många rapporter om att ny energiproduktion i Sverige tvärstoppas. Man fattar inte nya investeringsbeslut.",
              date: "2025-05-21",
              imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/bc5c4354-fca3-4071-8096-acd9b7b1d09a_192.jpg",
            },
          ],
        },
      ],
      takeaway: "S:s beteende är strategiskt, inte slumpmässigt. De navigerar mellan industrins krav och miljörörelsens kritik. Förvänta samma mönster på frågor som kan framställas som 'tekniska'.",
    },

    // ════════════════════════════════════════════════════════════════════════
    // DEL 3: APPENDIX (endast tidslinje och metodik)
    // ════════════════════════════════════════════════════════════════════════
    {
      type: "divider",
      title: "Bakgrund & metodik",
    },

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
  ],
};
