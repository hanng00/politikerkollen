import type { ExperimentDef, ExperimentKey } from "./types";

/**
 * Central registry for the six viral engagement loops.
 *
 * Toggle a loop on/off with `enabled`. Add/remove `variants` to change the
 * A/B split. The first variant is always the control. Everything else in the
 * app reads from here — there is no other source of truth.
 *
 * Env override: set `NEXT_PUBLIC_EXPERIMENTS_DISABLED=loftesmataren,duell` to
 * force specific loops off at build/runtime without editing this file.
 */
export const EXPERIMENTS: Record<ExperimentKey, ExperimentDef> = {
  sveket: {
    key: "sveket",
    name: "Sveket",
    description:
      "Personligt sveks-kvitto efter frågekompassen. Visar vilka löften ett parti höll vs. röstade emot — kvittot är delningskortet.",
    enabled: true,
    route: "/sveket",
    variants: [
      { id: "control", label: "Kontroll (ingen kvittovy)" },
      { id: "receipt", label: "Kvitto" },
    ],
  },
  loftesmataren: {
    key: "loftesmataren",
    name: "Löftesmätaren",
    description:
      "Live-räknare över brutna löften sedan valet 2022. Inbäddningsbar widget, varje pip länkar till underlaget.",
    enabled: true,
    route: "/loftesmataren",
    variants: [
      { id: "control", label: "Kontroll (statisk siffra)" },
      { id: "live", label: "Live-räknare" },
    ],
  },
  wrapped: {
    key: "wrapped",
    name: "Riksdagen Wrapped",
    description:
      "Spotify-Wrapped-liknande svepbar 9:16-story för en ledamot eller ett parti, med betyg och källor.",
    enabled: true,
    route: "/wrapped",
    variants: [
      { id: "control", label: "Kontroll (vanlig profil)" },
      { id: "stories", label: "Story-läge" },
    ],
  },
  spara: {
    key: "spara",
    name: "Spåra hen",
    description:
      "Följ en politiker/parti och få varning när ett löfte bryts. Delningsbart varningskort.",
    enabled: true,
    route: "/spara",
    variants: [
      { id: "control", label: "Kontroll (ingen följ-knapp)" },
      { id: "follow", label: "Följ + varningar" },
    ],
  },
  duell: {
    key: "duell",
    name: "Spelar de roll?",
    description:
      "Tinder-liknande duell: 'sa X' vs 'gjorde Y'. Svep höll/bröt, få poäng och dela resultatet.",
    enabled: true,
    route: "/duell",
    variants: [
      { id: "control", label: "Kontroll (lista)" },
      { id: "swipe", label: "Svep-duell" },
    ],
  },
  valkrets: {
    key: "valkrets",
    name: "Min valkrets",
    description:
      "Postnummer/valkrets → A–F-betyg för lokala företrädare. Karta/lista och delningsbart lokalkort.",
    enabled: true,
    route: "/valkrets",
    variants: [
      { id: "control", label: "Kontroll (rikslista)" },
      { id: "local", label: "Lokalt betygskort" },
    ],
  },
};

/** All experiments as an ordered array (stable order for the lab UI). */
export const EXPERIMENT_LIST: ExperimentDef[] = [
  EXPERIMENTS.sveket,
  EXPERIMENTS.loftesmataren,
  EXPERIMENTS.wrapped,
  EXPERIMENTS.spara,
  EXPERIMENTS.duell,
  EXPERIMENTS.valkrets,
];

/** Loops force-disabled via env, e.g. "loftesmataren,duell". */
function envDisabledKeys(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_EXPERIMENTS_DISABLED ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Resolve the effective `enabled` state including env overrides. */
export function isExperimentEnabled(key: ExperimentKey): boolean {
  if (envDisabledKeys().has(key)) return false;
  return EXPERIMENTS[key]?.enabled ?? false;
}
