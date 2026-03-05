export const PARTY_COLORS: Record<string, string> = {
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
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
};

export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? "#6366f1";
}

export function getPartyName(party: string): string {
  return PARTY_NAMES[party] ?? party;
}
