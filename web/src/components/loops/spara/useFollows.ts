"use client";

import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

import { useIsHydrated } from "@/lib/useIsHydrated";

/**
 * Client-side follow + alert persistence stub.
 *
 * TODO(api): persist follows + push real alerts via a backend
 * (e.g. POST /follows + web push). For now this is localStorage-only and
 * synced across components in the same tab via a custom event.
 */

const STORAGE_KEY = "pk_follows_v1";
const CHANGE_EVENT = "pk-follows-changed";

export const FollowTargetSchema = z.object({
  type: z.enum(["party", "politician"]),
  id: z.string(),
  name: z.string(),
  /** Party abbrev for colour theming (own abbrev for parties). */
  party: z.string(),
});
export type FollowTarget = z.infer<typeof FollowTargetSchema>;

const FollowStateSchema = z.object({
  targets: z.array(FollowTargetSchema),
  alertsEnabled: z.boolean(),
});
type FollowState = z.infer<typeof FollowStateSchema>;

const EMPTY: FollowState = { targets: [], alertsEnabled: false };

function read(): FollowState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return FollowStateSchema.parse(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function write(state: FollowState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Cached snapshot so `useSyncExternalStore` gets a stable reference. */
let snapshotCache: { raw: string | null; state: FollowState } = {
  raw: null,
  state: EMPTY,
};

function getSnapshot(): FollowState {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapshotCache.raw) return snapshotCache.state;
  snapshotCache = { raw, state: raw ? safeParse(raw) : EMPTY };
  return snapshotCache.state;
}

function safeParse(raw: string): FollowState {
  try {
    return FollowStateSchema.parse(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function getServerSnapshot(): FollowState {
  return EMPTY;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export interface UseFollowsResult {
  targets: FollowTarget[];
  alertsEnabled: boolean;
  hydrated: boolean;
  isFollowing: (id: string) => boolean;
  follow: (target: FollowTarget) => void;
  unfollow: (id: string) => void;
  toggle: (target: FollowTarget) => void;
  setAlertsEnabled: (enabled: boolean) => void;
}

export function useFollows(): UseFollowsResult {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useIsHydrated();

  const isFollowing = useCallback(
    (id: string) => state.targets.some((t) => t.id === id),
    [state.targets],
  );

  const follow = useCallback((target: FollowTarget) => {
    const next = read();
    if (next.targets.some((t) => t.id === target.id)) return;
    write({ ...next, targets: [...next.targets, target] });
  }, []);

  const unfollow = useCallback((id: string) => {
    const next = read();
    write({ ...next, targets: next.targets.filter((t) => t.id !== id) });
  }, []);

  const toggle = useCallback((target: FollowTarget) => {
    const next = read();
    const exists = next.targets.some((t) => t.id === target.id);
    write({
      ...next,
      targets: exists
        ? next.targets.filter((t) => t.id !== target.id)
        : [...next.targets, target],
    });
  }, []);

  const setAlertsEnabled = useCallback((enabled: boolean) => {
    const next = read();
    write({ ...next, alertsEnabled: enabled });
  }, []);

  return {
    targets: state.targets,
    alertsEnabled: state.alertsEnabled,
    hydrated,
    isFollowing,
    follow,
    unfollow,
    toggle,
    setAlertsEnabled,
  };
}
