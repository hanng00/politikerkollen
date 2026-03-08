export const PARTY_ABBREVS = ["s", "m", "sd", "c", "v", "kd", "l", "mp"] as const;
export type PartyAbbrev = (typeof PARTY_ABBREVS)[number];

const PARTY_COLORS_LOWER: Record<string, string> = {
  s: "#E8112D",
  m: "#52BDEC",
  sd: "#DDDD00",
  c: "#009933",
  v: "#DA291C",
  kd: "#000077",
  l: "#006AB3",
  mp: "#83CF39",
};

const PARTY_NAMES_LOWER: Record<string, string> = {
  s: "Socialdemokraterna",
  m: "Moderaterna",
  sd: "Sverigedemokraterna",
  c: "Centerpartiet",
  v: "Vänsterpartiet",
  kd: "Kristdemokraterna",
  l: "Liberalerna",
  mp: "Miljöpartiet",
};

export const PARTY_COLORS: Record<string, string> = {
  ...PARTY_COLORS_LOWER,
  S: "#E8112D",
  M: "#52BDEC",
  SD: "#DDDD00",
  C: "#009933",
  V: "#DA291C",
  KD: "#000077",
  L: "#006AB3",
  MP: "#83CF39",
};

export const PARTY_NAMES: Record<string, string> = {
  ...PARTY_NAMES_LOWER,
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
};

export const CATEGORY_NAMES: Record<string, string> = {
  skatt: "Skatter",
  vard: "Vård & omsorg",
  skola: "Skola & utbildning",
  miljo: "Miljö & klimat",
  migration: "Migration",
  forsvar: "Försvar",
  rattsvasende: "Rättsväsende",
  arbetsmarknad: "Arbetsmarknad",
  bostader: "Bostäder",
  pension: "Pension",
  ovrigt: "Övrigt",
};

export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? "#6366f1";
}

export function getPartyName(party: string): string {
  return PARTY_NAMES[party] ?? party.toUpperCase();
}
