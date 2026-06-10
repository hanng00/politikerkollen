"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import { ShareCardButton } from "@/components/share";
import type { ShareCardData } from "@/components/share";
import { getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";

export interface AlertItem {
  id: string;
  party: string;
  text: string;
  label: string;
  status: "broke" | "mixed";
}

export function buildAlertCard(item: AlertItem): ShareCardData {
  return {
    kind: "alert",
    accent: item.status === "broke" ? "#ef4444" : "#f59e0b",
    eyebrow: "Löftesvarning",
    title: getPartyName(item.party),
    subtitle: item.text,
    verdict: {
      label: item.status === "broke" ? "Bröt löftet" : "Motsägelsefullt",
      tone: item.status === "broke" ? "negative" : "warning",
    },
    source: "Riksdagens öppna data via Politikerkollen",
  };
}

/** In-app alert card with a share affordance. */
export function AlertCard({ item }: { item: AlertItem }) {
  const color = getPartyColor(item.party);
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/loften/${item.id}` : "https://politikerkollen.org";

  return (
    <div className="overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/5">
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
        style={{
          backgroundColor: item.status === "broke" ? "color-mix(in oklch, var(--destructive) 12%, transparent)" : "color-mix(in oklch, var(--warning) 14%, transparent)",
          color: item.status === "broke" ? "var(--destructive)" : "var(--warning)",
        }}
      >
        <AlertTriangle className="size-3.5" />
        Löftesvarning
      </div>
      <div className="flex items-start gap-3 p-4">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ backgroundColor: color, color: needsDarkText(item.party) ? "#000" : "#fff" }}
        >
          {item.party.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{getPartyName(item.party)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
        <Link
          href={`/loften/${item.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Se underlaget <ChevronRight className="size-3.5" />
        </Link>
        <ShareCardButton
          card={buildAlertCard(item)}
          text={`Varning: ${getPartyName(item.party)} bröt ett löfte. Underlag:`}
          url={shareUrl}
          label="Dela varning"
          size="default"
          variant="outline"
          filename={`varning-${item.party.toLowerCase()}`}
        />
      </div>
    </div>
  );
}
