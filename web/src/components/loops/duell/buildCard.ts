import type { ShareCardData } from "@/components/share";

export function buildDuellCard(correct: number, total: number): ShareCardData {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const accent = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return {
    kind: "duel",
    accent,
    eyebrow: "Spelar de roll?",
    title: "Hur väl känner du dina politiker?",
    stat: { value: `${correct}/${total}`, caption: `rätt — ${pct}% träffsäkerhet` },
    subtitle:
      pct >= 70
        ? "Du genomskådar retoriken. Testa en vän."
        : "Det är svårare än man tror att gissa rätt. Testa själv.",
    source: "Riksdagens öppna data via Politikerkollen",
  };
}
