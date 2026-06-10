"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hydration-safe "are we on the client yet?" flag without calling setState in
 * an effect. Returns false on the server and during the first hydration pass,
 * then true once mounted.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
