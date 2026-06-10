"use client";

import { ArrowUpRight, FlaskConical } from "lucide-react";
import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EXPERIMENT_LIST, isExperimentEnabled, useExperiment } from "@/lib/experiments";
import type { ExperimentDef } from "@/lib/experiments";

function ExperimentRow({ def }: { def: ExperimentDef }) {
  const { variant, resolved } = useExperiment(def.key);
  const enabled = isExperimentEnabled(def.key);

  return (
    <StaggerItem>
      <Card className="group transition-all hover:ring-primary/20">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">{def.name}</h3>
                <Badge variant={enabled ? "default" : "outline"} className="text-[10px]">
                  {enabled ? "Aktiv" : "Av"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {def.description}
              </p>
            </div>
            <Link
              href={`/lab/${def.key}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Öppna ${def.name}`}
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Din variant
            </span>
            {resolved ? (
              <Badge variant="secondary" className="text-[10px]">
                {variant}
              </Badge>
            ) : (
              <span className="h-4 w-12 animate-pulse rounded bg-muted" />
            )}
            <span className="mx-1 text-border">·</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tvinga
            </span>
            {def.variants.map((v) => (
              <Link
                key={v.id}
                href={`/lab/${def.key}?variant=${v.id}`}
                className="rounded-full border px-2 py-0.5 text-[10px] transition-colors hover:bg-muted"
              >
                {v.id}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  );
}

export default function LabIndexPage() {
  return (
    <main className="page-container-narrow page-section">
      <Reveal className="mb-8 flex flex-col items-center text-center" from="up">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl border bg-card">
          <FlaskConical className="size-5 text-primary" />
        </div>
        <h1 className="page-title">Politikerkollen Lab</h1>
        <p className="page-subtitle">
          Förhandsvisa de sex virala funktionerna. Varje funktion bucketas till en
          variant per besökare och kan A/B-testas i produktion. Tvinga en variant
          via länkarna nedan.
        </p>
      </Reveal>

      <Stagger className="flex flex-col gap-3">
        {EXPERIMENT_LIST.map((def) => (
          <ExperimentRow key={def.key} def={def} />
        ))}
      </Stagger>
    </main>
  );
}
