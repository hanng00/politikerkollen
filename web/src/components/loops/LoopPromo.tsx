"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion";
import { EXPERIMENTS, useExperiment, type ExperimentKey } from "@/lib/experiments";
import { cn } from "@/lib/utils";

interface LoopPromoProps {
  experiment: ExperimentKey;
  /** Override copy; defaults to the experiment's name/description. */
  title?: string;
  body?: string;
  cta?: string;
  className?: string;
}

/**
 * Experiment-gated funnel entry point. Drop this anywhere in the main funnel to
 * A/B test a loop in production: it renders only when the master flag is on and
 * the visitor is bucketed out of `control`. Exposure + clicks are tracked.
 */
export function LoopPromo({ experiment, title, body, cta, className }: LoopPromoProps) {
  const def = EXPERIMENTS[experiment];
  const { enabled, isControl, resolved, track } = useExperiment(experiment);

  // Don't render until resolved (avoids flash) or when gated out.
  if (!resolved || !enabled || isControl) return null;

  return (
    <Reveal whenInView from="up" className={cn("px-4 sm:px-6", className)}>
      <Link
        href={def.route}
        onClick={() => track("loop_promo_click", { route: def.route })}
        className="group flex items-center gap-4 rounded-2xl border bg-card p-5 ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:ring-primary/20"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Inför valet 2026
          </p>
          <h3 className="mt-1 text-base font-semibold">{title ?? def.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{body ?? def.description}</p>
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary">
          {cta ?? "Testa"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </Reveal>
  );
}
