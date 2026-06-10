"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { EXPERIMENTS, isExperimentEnabled } from "./config";
import { pickVariant, subscribeVisitorId, visitorIdSnapshot } from "./bucket";
import type { ExperimentAssignment, ExperimentKey } from "./types";

interface UseExperimentResult extends ExperimentAssignment {
  /**
   * False during the very first client render (before the visitor id is read).
   * Gate UI on this to avoid hydration mismatches / layout flashes.
   */
  resolved: boolean;
  /** Emit a typed analytics event scoped to this experiment + variant. */
  track: (event: string, props?: Record<string, unknown>) => void;
}

/**
 * Resolve the variant for one experiment for the current visitor.
 *
 * - Returns `enabled: false` when the master flag (or env override) is off.
 * - Honours `?variant=<id>` in the URL so the `/lab` surface can force a
 *   specific variant for previews and screenshots.
 * - Persists nothing itself beyond the visitor id; assignment is a pure
 *   function of (visitorId, experiment config).
 */
export function useExperiment(key: ExperimentKey): UseExperimentResult {
  const def = EXPERIMENTS[key];
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const forcedVariant = searchParams.get("variant");

  // Hydration-safe read of the (client-only) visitor id.
  const visitorId = useSyncExternalStore(
    subscribeVisitorId,
    visitorIdSnapshot,
    () => "ssr",
  );
  const resolved = visitorId !== "ssr";

  const enabled = isExperimentEnabled(key);

  const variant = useMemo(() => {
    if (forcedVariant && def.variants.some((v) => v.id === forcedVariant)) {
      return forcedVariant;
    }
    if (!resolved) return def.variants[0].id;
    return pickVariant(def, visitorId);
  }, [def, forcedVariant, visitorId, resolved]);

  const isControl = variant === def.variants[0].id;

  // Fire a single exposure event once the assignment is resolved.
  const exposureFired = useRef<string | null>(null);
  useEffect(() => {
    if (!resolved || !enabled) return;
    const fingerprint = `${key}:${variant}`;
    if (exposureFired.current === fingerprint) return;
    exposureFired.current = fingerprint;
    try {
      posthog.capture("experiment_exposure", {
        experiment: key,
        variant,
        is_control: isControl,
        pathname,
      });
      // Register as a person/event super-property so downstream events are
      // automatically segmented by the assigned variant.
      posthog.register({ [`exp_${key}`]: variant });
    } catch {
      // PostHog may be uninitialised in some contexts; never throw.
    }
  }, [resolved, enabled, key, variant, isControl, pathname]);

  const track = useMemo(
    () =>
      (event: string, props?: Record<string, unknown>) => {
        try {
          posthog.capture(event, {
            experiment: key,
            variant,
            ...props,
          });
        } catch {
          // ignore analytics failures
        }
      },
    [key, variant],
  );

  return { key, variant, enabled, isControl, resolved, track };
}
