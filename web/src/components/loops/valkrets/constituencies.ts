import type { Constituency } from "@/types";

/**
 * Constituency (valkrets) fixtures + a postcode resolver.
 *
 * TODO(api): replace with a real postcode → valkrets lookup (Valmyndigheten /
 * SCB data). The prefix map below is a pragmatic approximation for demoing.
 */
export const CONSTITUENCIES: Constituency[] = [
  { id: "stockholms-kommun", name: "Stockholms kommun", slug: "stockholms-kommun", seats: 29 },
  { id: "stockholms-lan", name: "Stockholms län", slug: "stockholms-lan", seats: 41 },
  { id: "goteborg", name: "Göteborgs kommun", slug: "goteborg", seats: 17 },
  { id: "skane-s", name: "Skåne läns södra", slug: "skane-sodra", seats: 12 },
  { id: "malmo", name: "Malmö kommun", slug: "malmo", seats: 10 },
  { id: "vastra-gotaland-v", name: "Västra Götalands läns västra", slug: "vg-vastra", seats: 11 },
  { id: "uppsala", name: "Uppsala län", slug: "uppsala", seats: 12 },
  { id: "ostergotland", name: "Östergötlands län", slug: "ostergotland", seats: 12 },
  { id: "vasterbotten", name: "Västerbottens län", slug: "vasterbotten", seats: 9 },
  { id: "norrbotten", name: "Norrbottens län", slug: "norrbotten", seats: 8 },
];

/** Postcode 2-digit prefix → constituency id. Approximate. */
const PREFIX_MAP: Record<string, string> = {
  "10": "stockholms-kommun",
  "11": "stockholms-kommun",
  "12": "stockholms-kommun",
  "13": "stockholms-lan",
  "14": "stockholms-lan",
  "15": "stockholms-lan",
  "18": "stockholms-lan",
  "19": "stockholms-lan",
  "40": "goteborg",
  "41": "goteborg",
  "42": "vastra-gotaland-v",
  "43": "vastra-gotaland-v",
  "20": "malmo",
  "21": "malmo",
  "22": "skane-s",
  "23": "skane-s",
  "75": "uppsala",
  "74": "uppsala",
  "58": "ostergotland",
  "60": "ostergotland",
  "90": "vasterbotten",
  "91": "vasterbotten",
  "97": "norrbotten",
  "98": "norrbotten",
};

const byId = new Map(CONSTITUENCIES.map((c) => [c.id, c]));

/** Normalise free-form postcode input ("114 35", "11435") → digits only. */
export function normalisePostcode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 5);
}

export function resolveConstituency(postcodeInput: string): Constituency | null {
  const digits = normalisePostcode(postcodeInput);
  if (digits.length < 2) return null;
  const prefix = digits.slice(0, 2);
  const id = PREFIX_MAP[prefix] ?? "stockholms-lan"; // sensible default
  return byId.get(id) ?? null;
}
