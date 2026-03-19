/**
 * Static report data for the Intelligence Reports feature.
 * This is hardcoded for now - will be generated from the analysis scripts later.
 */

import { strandskyddReport } from "./strandskydd-report";
// Old energy report variant - replaced by Pyramid Principle version
// import { energiReport } from "./energi-report";
import { energiReportV2 } from "./energi-report-v2";

export interface Politician {
  name: string;
  party: string;
  imageUrl: string;
  role?: string;
}

export interface ReportQuote {
  date: string;
  politician: string;
  party: string;
  context: string;
  imageUrl?: string;
}

export interface TrendDataPoint {
  month: string;
  [party: string]: number | string;
}

export interface ReportSection {
  type: "narrative" | "chart" | "quotes" | "table" | "callout" | "timeline" | "vote-result" | "politicians" | "data-gap" | "divider" | "source-list" | "executive-summary" | "executive-summary-v2" | "implications" | "methodology" | "stakeholders" | "pyramid-section";
  title?: string;
  content?: string;
  data?: TrendDataPoint[] | ReportQuote[] | Record<string, unknown>[];
  chartType?: "line" | "bar" | "area";
  highlight?: "spike" | "drop" | "convergence" | "prediction-correct" | "prediction-wrong" | "warning" | "opportunity";
  politicians?: Politician[];
  part?: number;
  // Pyramid section fields
  actionTitle?: string;
  supportingFacts?: string[];
  evidence?: Array<{ type: string; data: unknown }>;
  takeaway?: string;
}

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  vertical: "energi" | "fastighet" | "general";
  summary: string;
  keyInsight: string;
  sections: ReportSection[];
  tags: string[];
  iteration?: number;
  predictionMade?: string;
  predictionOutcome?: string;
}

export const reports: Report[] = [
  energiReportV2,
  // energiReport, // Old variant - replaced by Pyramid Principle version (energiReportV2)
  strandskyddReport,
  {
    id: "karnkraft-september-2025",
    title: "Kärnkraftsdebatten exploderar",
    subtitle: "September 2025 såg en dramatisk ökning av kärnkraftsdiskussioner i riksdagen",
    date: "2025-09-30",
    vertical: "energi",
    summary: "I september 2025 ökade omnämnanden av kärnkraft med över 200% jämfört med genomsnittet. Centerpartiet, som historiskt varit skeptiska, tredubblade sina omnämnanden.",
    keyInsight: "Centerpartiet ökade sina kärnkraftsomnämnanden från ~4 till 15 per månad (z-score 2.7) — en potentiell positionsförändring.",
    tags: ["kärnkraft", "energi", "C", "M", "S"],
    sections: [
      {
        type: "callout",
        title: "Nyckelinsikt",
        content: "Centerpartiet tredubblade sina kärnkraftsomnämnanden i september 2025. Detta är statistiskt signifikant (z=2.7) och kan indikera en positionsförändring inför kommande energipolitiska beslut.",
        highlight: "spike",
      },
      {
        type: "narrative",
        content: "September 2025 markerade en vändpunkt i den svenska kärnkraftsdebatten. Vår AI-analys av riksdagsanföranden visar att samtliga partier ökade sina omnämnanden av kärnkraft, men det mest anmärkningsvärda var Centerpartiets dramatiska ökning.",
      },
      {
        type: "chart",
        title: "Kärnkraftsomnämnanden per månad",
        chartType: "area",
        data: [
          { month: "2025-01", M: 8, S: 4, C: 3, SD: 5, KD: 6, V: 3, L: 4, MP: 5 },
          { month: "2025-02", M: 16, S: 16, C: 5, SD: 8, KD: 12, V: 6, L: 8, MP: 10 },
          { month: "2025-03", M: 2, S: 3, C: 2, SD: 2, KD: 2, V: 1, L: 2, MP: 2 },
          { month: "2025-04", M: 6, S: 1, C: 3, SD: 4, KD: 5, V: 2, L: 3, MP: 4 },
          { month: "2025-05", M: 15, S: 6, C: 5, SD: 7, KD: 8, V: 4, L: 6, MP: 6 },
          { month: "2025-06", M: 1, S: 1, C: 1, SD: 1, KD: 1, V: 0, L: 1, MP: 1 },
          { month: "2025-07", M: 5, S: 0, C: 2, SD: 3, KD: 4, V: 2, L: 2, MP: 3 },
          { month: "2025-08", M: 18, S: 10, C: 6, SD: 9, KD: 10, V: 5, L: 18, MP: 8 },
          { month: "2025-09", M: 28, S: 15, C: 15, SD: 12, KD: 14, V: 8, L: 10, MP: 12 },
          { month: "2025-10", M: 9, S: 2, C: 4, SD: 5, KD: 6, V: 3, L: 4, MP: 5 },
          { month: "2025-11", M: 24, S: 6, C: 7, SD: 8, KD: 10, V: 5, L: 7, MP: 7 },
          { month: "2025-12", M: 8, S: 2, C: 3, SD: 4, KD: 5, V: 2, L: 3, MP: 4 },
        ],
      },
      {
        type: "narrative",
        title: "Vad hände i september?",
        content: "Analysen visar att ökningen sammanföll med riksdagsdebatten om 'Finansiering och riskdelning vid investeringar i ny kärnkraft'. Detta var en av de mest debatterade frågorna under hösten 2025, med 88 anföranden från 12 politiker.",
      },
      {
        type: "table",
        title: "Anomalier i september 2025",
        data: [
          { parti: "M", mentions: 28, average: 11.6, zScore: 2.0, signal: "📈 Spike" },
          { parti: "C", mentions: 15, average: 4.4, zScore: 2.7, signal: "📈 Spike" },
          { parti: "S", mentions: 15, average: 5.8, zScore: 1.8, signal: "📈 Spike" },
          { parti: "KD", mentions: 14, average: 7.2, zScore: 1.4, signal: "Förhöjd" },
          { parti: "SD", mentions: 12, average: 5.5, zScore: 1.3, signal: "Förhöjd" },
        ],
      },
      {
        type: "quotes",
        title: "Utvalda citat från debatten",
        data: [
          {
            date: "2025-09-15",
            politician: "Rickard Nordin",
            party: "C",
            context: "Vi måste vara pragmatiska. Kärnkraften har en roll att spela i energimixen, även om vi fortsätter satsa på förnybart.",
          },
          {
            date: "2025-09-18",
            politician: "Ebba Busch",
            party: "KD",
            context: "Sverige behöver mer planerbar elproduktion. Kärnkraften är en del av lösningen för att säkra vår energiförsörjning.",
          },
          {
            date: "2025-09-22",
            politician: "Fredrik Olovsson",
            party: "S",
            context: "Vi är öppna för att diskutera kärnkraftens framtid, men det måste ske på marknadens villkor utan statliga subventioner.",
          },
        ],
      },
      {
        type: "narrative",
        title: "Vad betyder detta?",
        content: "Den dramatiska ökningen av kärnkraftsdiskussioner, särskilt från Centerpartiet, kan signalera en bredare politisk omsvängning. För aktörer inom energisektorn innebär detta potentiellt nya möjligheter för kärnkraftsinvesteringar och en mer gynnsam politisk miljö.",
      },
    ],
  },
  {
    id: "strandskydd-augusti-2025",
    title: "Strandskyddsreformen tar fart",
    subtitle: "Alla partier ökade sina diskussioner om strandskydd i augusti 2025",
    date: "2025-08-31",
    vertical: "fastighet",
    summary: "Augusti 2025 såg en koordinerad ökning av strandskyddsdiskussioner över partigränserna. MP och SD, som normalt står långt ifrån varandra, ökade båda sina omnämnanden markant.",
    keyInsight: "SD och MP ökade båda strandskyddsomnämnanden med över 200% — men med helt motsatt inramning.",
    tags: ["strandskydd", "fastighet", "bygglov", "MP", "SD"],
    sections: [
      {
        type: "callout",
        title: "Nyckelinsikt",
        content: "Strandskyddsdebatten intensifierades i augusti 2025 med ökningar från alla partier. Anmärkningsvärt är att MP och SD — som normalt står långt ifrån varandra — båda ökade sina omnämnanden, men med helt motsatt inramning.",
        highlight: "spike",
      },
      {
        type: "narrative",
        content: "Strandskyddet har länge varit en het politisk fråga i Sverige. I augusti 2025 nådde debatten nya höjder när regeringens reformförslag diskuterades i riksdagen. Vår analys visar tydliga skillnader i hur partierna ramar in frågan.",
      },
      {
        type: "chart",
        title: "Strandskyddsomnämnanden per parti (augusti 2025)",
        chartType: "bar",
        data: [
          { month: "2025-08", MP: 8, SD: 8, KD: 7, L: 6, M: 5, S: 4, C: 4, V: 3 },
        ],
      },
      {
        type: "quotes",
        title: "Kontrasterande inramningar",
        data: [
          {
            date: "2025-08-15",
            politician: "Martin Kinnunen",
            party: "SD",
            context: "Ett reformerat strandskydd är en frihetsreform som ger människor möjlighet att bygga sina drömboenden nära vatten.",
          },
          {
            date: "2025-08-18",
            politician: "Rebecka Le Moine",
            party: "MP",
            context: "Allemansrätten och möjligheten att gå längs våra stränder hotas av regeringens förslag att försämra strandskyddet.",
          },
        ],
      },
      {
        type: "narrative",
        title: "Implikationer för fastighetsbranschen",
        content: "För aktörer inom fastighetsutveckling innebär den politiska rörelsen mot ett lättat strandskydd potentiellt nya möjligheter för kustnära byggprojekt. Dock kvarstår osäkerhet kring den slutliga utformningen av reglerna.",
      },
    ],
  },
  {
    id: "vindkraft-februari-2025",
    title: "Vindkraftsdebatten når kulmen",
    subtitle: "Februari 2025 såg den mest intensiva vindkraftsdebatten på flera år",
    date: "2025-02-28",
    vertical: "energi",
    summary: "Alla riksdagspartier ökade sina vindkraftsomnämnanden dramatiskt i februari 2025. KD ledde med en ökning på 300% från genomsnittet.",
    keyInsight: "KD ökade från 6 till 26 vindkraftsomnämnanden (z=3.0) — den största avvikelsen för något parti på något ämne under 2025.",
    tags: ["vindkraft", "energi", "KD", "S", "MP"],
    sections: [
      {
        type: "callout",
        title: "Nyckelinsikt",
        content: "Februari 2025 var den mest intensiva månaden för vindkraftsdebatt i riksdagen. KD:s ökning från 6 till 26 omnämnanden (z-score 3.0) var den största statistiska avvikelsen för något parti på något ämne under hela 2025.",
        highlight: "spike",
      },
      {
        type: "chart",
        title: "Vindkraftsomnämnanden februari 2025 vs genomsnitt",
        chartType: "bar",
        data: [
          { parti: "KD", februari: 26, genomsnitt: 6.4 },
          { parti: "S", februari: 24, genomsnitt: 6.8 },
          { parti: "MP", februari: 20, genomsnitt: 4.5 },
          { parti: "M", februari: 13, genomsnitt: 5.3 },
          { parti: "SD", februari: 11, genomsnitt: 4.3 },
          { parti: "C", februari: 8, genomsnitt: 3.4 },
          { parti: "V", februari: 7, genomsnitt: 2.8 },
        ],
      },
      {
        type: "narrative",
        content: "Den intensiva debatten i februari sammanföll med flera viktiga händelser: nya vindkraftsprojekt i norra Sverige, diskussioner om havsbaserad vindkraft, och debatter om kommunernas vetorätt. Alla partier engagerade sig, men med olika perspektiv.",
      },
    ],
  },
  {
    id: "energipolitik-prediktion-2026",
    title: "Energipolitik 2026: Tre beslut som formar marknaden",
    subtitle: "Prediktionsrapport för HD01NU13, HD01NU17 och HD01NU16 — beslut väntas Q1-Q2 2026",
    date: "2026-03-18",
    vertical: "energi",
    iteration: 1,
    summary: "Tre energipolitiska betänkanden väntar på beslut: Energipolitik, Elmarknadsfrågor och Mineralpolitik. Baserat på historiska röstmönster och partiernas retorik förutsäger vi utfallen.",
    keyInsight: "Regeringspartierna (M+KD+L+SD) har 86% Ja-frekvens i NU. Med 212 mandat mot oppositionens 186 förväntas alla tre betänkanden gå igenom — men S kan överraska på elmarknadsfrågor.",
    predictionMade: "2026-03-18: Regeringsförslag vinner alla tre omröstningar. S röstar Ja på elmarknad (punkt 1), Nej på kärnkraftsrelaterade punkter.",
    tags: ["energi", "kärnkraft", "elmarknad", "mineral", "prediktion", "pending"],
    sections: [
      {
        type: "callout",
        title: "LIVE PREDIKTION — Utfall ännu okänt",
        content: "Detta är en prediktionsrapport. Vi gör förutsägelser baserat på data och kommer följa upp när besluten fattas. Prediktionsdatum: 18 mars 2026.",
        highlight: "prediction-correct",
      },
      {
        type: "narrative",
        title: "Bakgrund: Tre avgörande beslut",
        content: "Näringsutskottet (NU) har tre betänkanden som väntar på beslut: HD01NU13 (Energipolitik), HD01NU17 (Elmarknadsfrågor) och HD01NU16 (Mineralpolitik). Dessa beslut kommer forma Sveriges energimarknad för kommande decennium — från kärnkraftsinvesteringar till elnätsutbyggnad och mineralutvinning för batterier.",
      },
      {
        type: "timeline",
        title: "Pågående lagstiftningskedja",
        data: [
          { date: "2025-03-27", event: "PROPOSITION", description: "Kärnkraftsfinansiering (HC03150) läggs", actor: "Regeringen" },
          { date: "2025-05-21", event: "BESLUT", description: "Kärnkraftsfinansiering antas (154-151)", actor: "Riksdagen" },
          { date: "2025-06-17", event: "PROPOSITION", description: "Höjd fastighetsskatt vindkraft (HC03168)", actor: "Regeringen" },
          { date: "2025-11-11", event: "BETÄNKANDE", description: "HD01NU13 Energipolitik publiceras", actor: "NU" },
          { date: "2025-11-11", event: "BETÄNKANDE", description: "HD01NU17 Elmarknadsfrågor publiceras", actor: "NU" },
          { date: "2025-11-11", event: "BETÄNKANDE", description: "HD01NU16 Mineralpolitik publiceras", actor: "NU" },
          { date: "2026-Q1/Q2", event: "BESLUT", description: "Omröstning väntas", actor: "Riksdagen" },
        ],
      },
      {
        type: "table",
        title: "Mandatfördelning: Regeringen vs Opposition",
        data: [
          { block: "Regeringsunderlag", partier: "M + KD + L + SD", mandat: 212, procent: "53%" },
          { block: "Opposition", partier: "S + V + C + MP", mandat: 186, procent: "46%" },
          { block: "Övriga", partier: "-", mandat: 5, procent: "1%" },
        ],
      },
      {
        type: "chart",
        title: "Historiska röstmönster i NU (2025)",
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
      {
        type: "narrative",
        title: "Analys: Varför SD är nyckeln",
        content: "SD har lägre Ja-frekvens (55%) än övriga regeringspartier (81-86%). Detta beror på att SD ibland röstar med oppositionen i specifika frågor. Men i energifrågor har SD varit konsekvent — de röstade Ja på alla punkter i kärnkraftsfinansieringen (HC01NU20). Vi förväntar oss samma mönster här.",
      },
      {
        type: "vote-result",
        title: "Referens: Kärnkraftsfinansieringen (HC01NU20, 21 maj 2025)",
        data: [
          { punkt: "1", rubrik: "Huvudförslaget", ja: 154, nej: 151, avstar: 0, jaPartier: "M, KD, L, SD", nejPartier: "S, C, MP, V" },
          { punkt: "2", rubrik: "Detaljfråga", ja: 154, nej: 15, avstar: 136, jaPartier: "M, KD, L, SD", nejPartier: "MP", avstarPartier: "S, C, V" },
          { punkt: "3", rubrik: "Bred enighet", ja: 255, nej: 36, avstar: 14, jaPartier: "M, KD, L, SD, S, C", nejPartier: "MP, V" },
          { punkt: "4", rubrik: "Reservation", ja: 154, nej: 94, avstar: 57, jaPartier: "M, KD, L, SD", nejPartier: "S", avstarPartier: "C, MP, V" },
        ],
      },
      {
        type: "quotes",
        title: "Signaler från debatten",
        data: [
          {
            date: "2025-05-21",
            politician: "Fredrik Olovsson",
            party: "S",
            imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/e7e4132a-b4df-11d5-8079-0040ca16072a_192.jpg",
            context: "Vi får många rapporter om att ny energiproduktion i Sverige tvärstoppas. Man fattar inte nya investeringsbeslut.",
          },
          {
            date: "2025-05-21",
            politician: "Rickard Nordin",
            party: "C",
            imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/a57d39bb-9f60-4def-ab90-97791ec56447_192.jpg",
            context: "Jag ser en majoritet för stärkt vattenkraft, effektökningar, pumpkraft — mycket mer kostnadseffektivt än regeringens kärnkraftsförslag.",
          },
          {
            date: "2025-05-21",
            politician: "Tobias Andersson",
            party: "SD",
            imageUrl: "https://data.riksdagen.se/filarkiv/bilder/ledamot/57cbe134-829b-4fb8-9cc1-ce2f1cd02f3b_192.jpg",
            context: "Oavsett om det rör sig om väg, el eller energiinfrastruktur finns det stora risker — men vi måste skydda det system som blivit så eftersatt.",
          },
        ],
      },
      {
        type: "callout",
        title: "VÅR PREDIKTION (18 mars 2026)",
        content: "HD01NU13 (Energipolitik): Regeringsförslag vinner 212-186. HD01NU17 (Elmarknadsfrågor): Regeringsförslag vinner, men S kan rösta Ja på vissa punkter (bred majoritet möjlig). HD01NU16 (Mineralpolitik): Regeringsförslag vinner 212-186, MP och V röstar emot.",
        highlight: "prediction-correct",
      },
      {
        type: "table",
        title: "Prediktionssammanfattning",
        data: [
          { betankande: "HD01NU13", titel: "Energipolitik", prediktion: "Regeringen vinner", konfidens: "85%", nyckelfraga: "Kärnkraftssatsningar" },
          { betankande: "HD01NU17", titel: "Elmarknadsfrågor", prediktion: "Bred majoritet möjlig", konfidens: "70%", nyckelfraga: "S position avgör" },
          { betankande: "HD01NU16", titel: "Mineralpolitik", prediktion: "Regeringen vinner", konfidens: "90%", nyckelfraga: "Uranförbud borttaget" },
        ],
      },
      {
        type: "narrative",
        title: "Vad betyder detta för energibolag?",
        content: "För Vattenfall, Fortum och andra kärnkraftsaktörer: Finansieringsmodellen från maj 2025 står fast. Nya beslut kommer förstärka riktningen. För vindkraftsbolag (OX2, Eolus): Höjd fastighetsskatt (HC03168) väntar fortfarande på beslut — följ HD01NU13 noga. För mineralbolag: Uranförbudet är borttaget (HD01NU7, nov 2025). HD01NU16 kan öppna för fler mineralutvinningsprojekt.",
      },
      {
        type: "data-gap",
        title: "Vad vi saknar för skarpare prediktion",
        content: "Vår analys baseras på riksdagsdata. Med följande källor hade vi kunnat vara mer precisa:",
        data: [
          { source: "Utskottsreservationer", description: "Vilka partier har lagt reservationer på HD01NU13/17/16? Detta avslöjar exakt vilka punkter som blir stridsfrågor.", status: "Delvis" },
          { source: "Remissvar", description: "Vad sa Energiföretagen, Svensk Vindenergi och Naturskyddsföreningen? Deras argument återkommer i debatten.", status: "Saknas" },
          { source: "EU-direktiv", description: "Elmarknadsreformen (HD01NU17) påverkas av EU:s nya elmarknadsdesign. Hur bunden är Sverige?", status: "Saknas" },
          { source: "Partiernas energiprogram", description: "Har något parti uppdaterat sin energipolitik sedan valet 2022?", status: "Saknas" },
        ],
      },
      {
        type: "narrative",
        title: "Nästa steg: Uppföljning",
        content: "Vi kommer uppdatera denna rapport när besluten fattas. Bookmark denna sida för att se om vår prediktion stämde.",
      },
    ],
  },
];

export function getReportById(id: string): Report | undefined {
  return reports.find((r) => r.id === id);
}

export function getReportsByVertical(vertical: Report["vertical"]): Report[] {
  return reports.filter((r) => r.vertical === vertical);
}
