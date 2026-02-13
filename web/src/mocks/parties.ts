import type { Party } from "@/types";

export const parties: Party[] = [
  { id: "s", name: "Socialdemokraterna", shortName: "S", color: "#E8112d" },
  { id: "m", name: "Moderaterna", shortName: "M", color: "#52BDEC" },
  { id: "sd", name: "Sverigedemokraterna", shortName: "SD", color: "#DDDD00" },
  { id: "c", name: "Centerpartiet", shortName: "C", color: "#009933" },
  { id: "v", name: "Vänsterpartiet", shortName: "V", color: "#DA291C" },
  { id: "kd", name: "Kristdemokraterna", shortName: "KD", color: "#000077" },
  { id: "l", name: "Liberalerna", shortName: "L", color: "#006AB3" },
  { id: "mp", name: "Miljöpartiet", shortName: "MP", color: "#83CF39" },
];

export const getPartyById = (id: string): Party | undefined =>
  parties.find((p) => p.id === id);
