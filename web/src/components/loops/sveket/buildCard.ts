import type { ShareCardData } from "@/components/share";
import { getPartyColor, getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";
import { verdictStatus } from "@/lib/promise-verdict";

export interface ReceiptItem {
  id: string;
  text: string;
  status: ReturnType<typeof verdictStatus>;
  label: string;
}

/** Build receipt items from promise scores, ordered to tell an honest story. */
export function toReceiptItems(promises: PromiseScore[], max = 6): ReceiptItem[] {
  const items = promises
    .map((p) => ({
      id: p.promise_id,
      text: p.promise_text,
      status: verdictStatus(p.evidence_direction, p.has_contradiction),
      label: p.assessment_label,
    }))
    .filter((i) => i.status !== "neutral");

  const order = { broke: 0, mixed: 1, kept: 2, neutral: 3 } as const;
  items.sort((a, b) => order[a.status] - order[b.status]);
  return items.slice(0, max);
}

export function receiptTotals(items: ReceiptItem[]) {
  return {
    kept: items.filter((i) => i.status === "kept").length,
    broke: items.filter((i) => i.status === "broke").length,
    mixed: items.filter((i) => i.status === "mixed").length,
  };
}

/** Build the 9:16 share-card payload — the receipt IS the share card. */
export function buildSveketCard(
  party: string,
  items: ReceiptItem[],
): ShareCardData {
  const totals = receiptTotals(items);
  return {
    kind: "receipt",
    accent: getPartyColor(party),
    eyebrow: "Sveks-kvitto",
    title: getPartyName(party),
    subtitle: `${totals.kept} höll · ${totals.broke} bröt · ${totals.mixed} blandat — sedan valet 2022.`,
    lines: items.map((i) => ({
      label: i.text.length > 90 ? `${i.text.slice(0, 89)}…` : i.text,
      status: i.status,
      detail: i.label,
    })),
    source: "Riksdagens öppna data via Politikerkollen",
    footnote: "Bedömning baserad på röster, motioner och propositioner.",
  };
}
