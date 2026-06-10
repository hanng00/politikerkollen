"use client";

import Link from "next/link";

import { SveketExperience } from "@/components/loops/sveket";
import { LoftesmataretCounter } from "@/components/loops/loftesmataren";
import { WrappedPicker } from "@/components/loops/wrapped";
import { SparaExperience } from "@/components/loops/spara";
import { DuellExperience } from "@/components/loops/duell";
import { ValkretsExperience } from "@/components/loops/valkrets";
import { Badge } from "@/components/ui/badge";
import { EXPERIMENTS, useExperiment, type ExperimentKey } from "@/lib/experiments";

function LoopPreview({ keyName, variant }: { keyName: ExperimentKey; variant: string }) {
  switch (keyName) {
    case "sveket":
      return <SveketExperience />;
    case "loftesmataren":
      return <LoftesmataretCounter live={variant !== "control"} />;
    case "wrapped":
      return <WrappedPicker />;
    case "spara":
      return <SparaExperience />;
    case "duell":
      return <DuellExperience />;
    case "valkrets":
      return <ValkretsExperience />;
  }
}

/**
 * Lab preview surface for a single experiment. Shows the resolved/forced
 * variant and renders the loop. The `?variant=` URL param (handled in
 * useExperiment) forces a specific variant for screenshots and QA.
 */
export function LabExperimentClient({ experiment }: { experiment: ExperimentKey }) {
  const def = EXPERIMENTS[experiment];
  const { variant, enabled, isControl, resolved } = useExperiment(experiment);

  return (
    <div>
      <div className="border-b bg-card/50">
        <div className="page-container-narrow flex flex-wrap items-center gap-2 py-2 text-xs">
          <Link href="/lab" className="text-muted-foreground hover:text-foreground">
            ← Lab
          </Link>
          <span className="text-border">/</span>
          <span className="font-medium">{def.name}</span>
          <Badge variant={enabled ? "default" : "outline"} className="text-[10px]">
            {enabled ? "Aktiv" : "Av"}
          </Badge>
          {resolved && (
            <Badge variant="secondary" className="text-[10px]">
              variant: {variant}
              {isControl ? " (kontroll)" : ""}
            </Badge>
          )}
        </div>
      </div>
      <LoopPreview keyName={experiment} variant={variant} />
    </div>
  );
}
