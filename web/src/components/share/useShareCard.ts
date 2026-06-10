"use client";

import { useCallback, useState } from "react";

import { shareCardImageUrl, type ShareCardData } from "./shareCardData";

export type ShareStatus = "idle" | "preparing" | "shared" | "copied" | "error";

export interface ShareCardOptions {
  /** The card to rasterise + share. */
  card: ShareCardData;
  /** Pre-filled Swedish share copy (without the URL). */
  text: string;
  /** Canonical page URL the card links back to. */
  url: string;
  /** Share dialog title. */
  title?: string;
  /** Download filename (without extension). */
  filename?: string;
}

interface UseShareCardResult {
  status: ShareStatus;
  /** Same-origin URL of the generated PNG (for an <img> preview). */
  imageUrl: (card: ShareCardData) => string;
  /** Trigger the native share sheet, falling back to clipboard/download. */
  share: (options: ShareCardOptions) => Promise<void>;
}

async function fetchCardBlob(card: ShareCardData): Promise<Blob> {
  const res = await fetch(shareCardImageUrl(card));
  if (!res.ok) throw new Error(`share-card ${res.status}`);
  return res.blob();
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Share-card flow:
 * 1. Rasterise the card on the server (reliable, font-stable, no client libs).
 * 2. Prefer `navigator.share({ files })` so the image rides along on mobile.
 * 3. Fall back to copying the link + downloading the PNG on desktop.
 */
export function useShareCard(): UseShareCardResult {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const imageUrl = useCallback((card: ShareCardData) => shareCardImageUrl(card), []);

  const share = useCallback(async (options: ShareCardOptions) => {
    const { card, text, url, title = "Politikerkollen", filename = "politikerkollen" } = options;
    setStatus("preparing");

    try {
      const blob = await fetchCardBlob(card);
      const file = new File([blob], `${filename}.png`, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (
        typeof nav.share === "function" &&
        typeof nav.canShare === "function" &&
        nav.canShare({ files: [file] })
      ) {
        await nav.share({ files: [file], text, title, url });
        setStatus("shared");
      } else if (typeof nav.share === "function") {
        // Share without the file (older mobile browsers).
        await nav.share({ text, title, url });
        setStatus("shared");
      } else {
        // Desktop fallback: copy link + download the image.
        try {
          await navigator.clipboard.writeText(`${text} ${url}`);
          setStatus("copied");
        } catch {
          setStatus("idle");
        }
        downloadBlob(blob, filename);
      }
    } catch (err) {
      // AbortError = user dismissed the share sheet; treat as a no-op.
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2400);
    }
  }, []);

  return { status, imageUrl, share };
}
