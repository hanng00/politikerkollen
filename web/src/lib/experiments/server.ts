import { cookies } from "next/headers";

import { EXPERIMENTS, isExperimentEnabled } from "./config";
import { pickVariant, VISITOR_COOKIE } from "./bucket";
import type { ExperimentAssignment, ExperimentKey } from "./types";

/**
 * Server-side experiment resolution for React Server Components / route
 * handlers. Reads the visitor id cookie set by the client. When the cookie is
 * absent (first ever visit, before hydration) we fall back to the control
 * variant so SSR output is deterministic; the client will reconcile.
 */
export async function getServerExperiment(
  key: ExperimentKey,
): Promise<ExperimentAssignment> {
  const def = EXPERIMENTS[key];
  const enabled = isExperimentEnabled(key);

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value;

  const variant = visitorId ? pickVariant(def, visitorId) : def.variants[0].id;

  return {
    key,
    variant,
    enabled,
    isControl: variant === def.variants[0].id,
  };
}
