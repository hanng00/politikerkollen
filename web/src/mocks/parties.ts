import type { Party } from "@/types";
import { PARTY_COLORS, PARTY_NAMES } from "@/lib/parties";

export const parties: Party[] = [
  { id: "s", name: PARTY_NAMES.s, shortName: "S", color: PARTY_COLORS.s },
  { id: "m", name: PARTY_NAMES.m, shortName: "M", color: PARTY_COLORS.m },
  { id: "sd", name: PARTY_NAMES.sd, shortName: "SD", color: PARTY_COLORS.sd },
  { id: "c", name: PARTY_NAMES.c, shortName: "C", color: PARTY_COLORS.c },
  { id: "v", name: PARTY_NAMES.v, shortName: "V", color: PARTY_COLORS.v },
  { id: "kd", name: PARTY_NAMES.kd, shortName: "KD", color: PARTY_COLORS.kd },
  { id: "l", name: PARTY_NAMES.l, shortName: "L", color: PARTY_COLORS.l },
  { id: "mp", name: PARTY_NAMES.mp, shortName: "MP", color: PARTY_COLORS.mp },
];

export const getPartyById = (id: string): Party | undefined =>
  parties.find((p) => p.id === id);
