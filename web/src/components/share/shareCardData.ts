import { z } from "zod";

/**
 * Typed, validated payload for the 9:16 share-card image route.
 *
 * One flexible schema covers every loop's card. The renderer shows only the
 * sections present in the payload. `source` is REQUIRED and always rendered as
 * the "Källa: …" attribution line — a trust + legal requirement.
 *
 * Colours must be hex (the satori/ImageResponse renderer does not support the
 * project's oklch design tokens), so cards carry an explicit hex accent.
 */

const HEX = /^#([0-9a-fA-F]{3,8})$/;

export const ShareCardLineSchema = z.object({
  label: z.string().max(140),
  status: z.enum(["kept", "broke", "mixed", "neutral"]),
  detail: z.string().max(80).optional(),
});

export const ShareCardSchema = z.object({
  /** Drives layout emphasis. */
  kind: z
    .enum(["receipt", "stat", "grade", "alert", "duel"])
    .default("stat"),
  /** Hex accent colour (usually a party colour or a verdict colour). */
  accent: z.string().regex(HEX).default("#6366f1"),
  /** Small uppercase kicker. */
  eyebrow: z.string().max(48).optional(),
  /** Hero line. */
  title: z.string().max(180),
  /** Secondary line under the title. */
  subtitle: z.string().max(220).optional(),
  /** A verdict pill, e.g. "Bröt löftet". */
  verdict: z
    .object({
      label: z.string().max(40),
      tone: z.enum(["positive", "negative", "warning", "neutral"]),
    })
    .optional(),
  /** A single big number/stat with a caption (counters, wrapped recap). */
  stat: z
    .object({ value: z.string().max(16), caption: z.string().max(60) })
    .optional(),
  /** Big A–F grade letter (valkrets / wrapped). */
  grade: z.string().max(2).optional(),
  /** Itemised lines (the receipt). */
  lines: z.array(ShareCardLineSchema).max(7).optional(),
  /** REQUIRED source attribution. Rendered as "Källa: …". */
  source: z.string().min(1).max(120),
  /** Optional small footnote above the brand line. */
  footnote: z.string().max(120).optional(),
});

export type ShareCardData = z.infer<typeof ShareCardSchema>;
export type ShareCardLine = z.infer<typeof ShareCardLineSchema>;

/** Unicode-safe base64url helpers that work in both browser and edge runtime. */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalised);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode card data into a compact, URL-safe `d` query param. */
export function encodeShareCard(data: ShareCardData): string {
  const json = JSON.stringify(ShareCardSchema.parse(data));
  return bytesToBase64Url(new TextEncoder().encode(json));
}

/** Decode + validate a `d` query param back into typed card data. */
export function decodeShareCard(param: string): ShareCardData {
  const json = new TextDecoder().decode(base64UrlToBytes(param));
  return ShareCardSchema.parse(JSON.parse(json));
}

/** Build the absolute (or relative) image URL for a card. */
export function shareCardImageUrl(data: ShareCardData, origin = ""): string {
  return `${origin}/api/share-card?d=${encodeShareCard(data)}`;
}
