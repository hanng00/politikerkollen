import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import {
  decodeShareCard,
  ShareCardSchema,
  type ShareCardData,
} from "@/components/share/shareCardData";
import {
  renderShareCard,
  SHARE_CARD_SIZE,
} from "@/components/share/renderShareCard";

export const runtime = "edge";

const FALLBACK: ShareCardData = ShareCardSchema.parse({
  kind: "stat",
  accent: "#6366f1",
  eyebrow: "Politikerkollen",
  title: "Granska vad politiker lovar — och vad de faktiskt gör.",
  source: "Riksdagen via Politikerkollen",
});

/**
 * GET /api/share-card?d=<base64url ShareCardData>
 *
 * Renders a 1080x1920 PNG share card. Used by the client share flow which
 * fetches the PNG as a Blob and hands it to the Web Share API (with a
 * clipboard/download fallback).
 */
export async function GET(req: NextRequest): Promise<ImageResponse> {
  const param = req.nextUrl.searchParams.get("d");

  let data: ShareCardData = FALLBACK;
  if (param) {
    try {
      data = decodeShareCard(param);
    } catch {
      data = FALLBACK;
    }
  }

  return new ImageResponse(renderShareCard(data), {
    width: SHARE_CARD_SIZE.width,
    height: SHARE_CARD_SIZE.height,
  });
}
