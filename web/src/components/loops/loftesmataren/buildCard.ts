import type { ShareCardData } from "@/components/share";

export function buildLoftesmataretCard(
  brokeTotal: number,
  mixedTotal: number,
): ShareCardData {
  return {
    kind: "stat",
    accent: "#ef4444",
    eyebrow: "Löftesmätaren",
    title: "Brutna vallöften sedan valet 2022",
    stat: {
      value: String(brokeTotal),
      caption: `varav ${mixedTotal} dessutom motsägelsefulla`,
    },
    subtitle: "Räknaren bygger på riksdagens röster, motioner och propositioner.",
    source: "Riksdagens öppna data via Politikerkollen",
  };
}
