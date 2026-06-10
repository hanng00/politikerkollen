import type { ExperimentDef } from "./types";

/**
 * Deterministic, dependency-free bucketing.
 *
 * A visitor is assigned a stable random id once (persisted). For each
 * experiment we hash `visitorId:experimentKey` into a number in [0,1) and pick
 * a variant by cumulative weight. This is stable across reloads and devices
 * sharing the id, and never calls Math.random at assignment time so SSR and
 * client agree given the same id.
 */

const VISITOR_COOKIE = "pk_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** FNV-1a 32-bit hash → float in [0, 1). */
export function hashToUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Convert to unsigned and normalise.
  return (h >>> 0) / 0xffffffff;
}

/** Pick a variant id for a visitor deterministically by weight. */
export function pickVariant(def: ExperimentDef, visitorId: string): string {
  const total = def.variants.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  const point = hashToUnit(`${visitorId}:${def.key}`) * total;
  let acc = 0;
  for (const variant of def.variants) {
    acc += variant.weight ?? 1;
    if (point < acc) return variant.id;
  }
  return def.variants[0].id;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${VISITOR_MAX_AGE}; SameSite=Lax`;
}

/** A reasonably-random id without pulling in a dependency. */
function generateVisitorId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Get (or lazily create + persist) the visitor id on the client.
 * Persists to both cookie (so SSR can read it) and localStorage (resilience).
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "ssr";

  const fromCookie = readCookie(VISITOR_COOKIE);
  if (fromCookie) return fromCookie;

  let fromStorage: string | null = null;
  try {
    fromStorage = window.localStorage.getItem(VISITOR_COOKIE);
  } catch {
    // localStorage may be unavailable (private mode); ignore.
  }

  const id = fromStorage ?? generateVisitorId();
  writeCookie(VISITOR_COOKIE, id);
  try {
    window.localStorage.setItem(VISITOR_COOKIE, id);
  } catch {
    // ignore
  }
  return id;
}

/** Module-level cache so the snapshot is referentially stable across renders. */
let cachedVisitorId: string | null = null;

/** Stable snapshot getter for `useSyncExternalStore`. */
export function visitorIdSnapshot(): string {
  if (typeof window === "undefined") return "ssr";
  if (!cachedVisitorId) cachedVisitorId = getOrCreateVisitorId();
  return cachedVisitorId;
}

/** Visitor id never changes after creation, so subscribing is a no-op. */
export function subscribeVisitorId(): () => void {
  return () => {};
}

export { VISITOR_COOKIE };
