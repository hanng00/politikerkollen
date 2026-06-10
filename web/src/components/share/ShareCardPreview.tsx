"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { ShareCardButton } from "./ShareCardButton";
import { shareCardImageUrl, type ShareCardData } from "./shareCardData";

interface ShareCardPreviewProps {
  card: ShareCardData;
  /** Pre-filled Swedish share copy (without URL). */
  shareText: string;
  /** Canonical URL the card links back to. */
  url: string;
  shareLabel?: string;
  filename?: string;
  className?: string;
  onShare?: () => void;
}

/**
 * WYSIWYG preview of the 9:16 share card. Renders the exact PNG the user will
 * share via an <img> from the share-card route (zero layout duplication), with
 * the share button beneath it.
 */
export function ShareCardPreview({
  card,
  shareText,
  url,
  shareLabel = "Dela kortet",
  filename,
  className,
  onShare,
}: ShareCardPreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const src = shareCardImageUrl(card);

  return (
    <figure className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative w-full max-w-[300px] overflow-hidden rounded-xl ring-1 ring-foreground/10 shadow-2xl"
        style={{ aspectRatio: "1080 / 1920" }}
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Förhandsvisning av delningskort"
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <figcaption className="sr-only">
        Delningskort för Politikerkollen. Källa: {card.source}.
      </figcaption>
      <ShareCardButton
        card={card}
        text={shareText}
        url={url}
        label={shareLabel}
        filename={filename}
        onShare={onShare}
      />
    </figure>
  );
}
