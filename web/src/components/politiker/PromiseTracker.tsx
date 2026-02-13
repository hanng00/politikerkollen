"use client";

import { Check, X, Clock, Pause, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Promise as PoliticianPromise } from "@/types";

interface PromiseTrackerProps {
  promises: PoliticianPromise[];
  stats: {
    total: number;
    kept: number;
    broken: number;
    inProgress: number;
    stalled: number;
    notStarted: number;
  };
}

function getStatusIcon(status: PoliticianPromise["status"]) {
  switch (status) {
    case "kept":
      return <Check className="size-3" />;
    case "broken":
      return <X className="size-3" />;
    case "in_progress":
      return <Clock className="size-3" />;
    case "stalled":
      return <Pause className="size-3" />;
    case "not_started":
      return <Circle className="size-3" />;
  }
}

function getStatusStyles(status: PoliticianPromise["status"]) {
  switch (status) {
    case "kept":
      return "bg-success/10 text-success border-success/20";
    case "broken":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "in_progress":
      return "bg-chart-1/10 text-chart-1 border-chart-1/20";
    case "stalled":
      return "bg-warning/10 text-warning border-warning/20";
    case "not_started":
      return "bg-muted text-muted-foreground border-muted";
  }
}

function getStatusLabel(status: PoliticianPromise["status"]) {
  switch (status) {
    case "kept":
      return "Hållet";
    case "broken":
      return "Brutet";
    case "in_progress":
      return "Pågående";
    case "stalled":
      return "Stannat";
    case "not_started":
      return "Ej påbörjat";
  }
}

export function PromiseTracker({ promises, stats }: PromiseTrackerProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Vallöften</CardTitle>
        <CardDescription className="text-xs">
          Uppföljning av löften från valet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-5 gap-1 text-center">
          <div>
            <p className="text-lg font-bold text-success">{stats.kept}</p>
            <p className="text-[10px] text-muted-foreground">Hållna</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">{stats.broken}</p>
            <p className="text-[10px] text-muted-foreground">Brutna</p>
          </div>
          <div>
            <p className="text-lg font-bold text-chart-1">{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">Pågående</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warning">{stats.stalled}</p>
            <p className="text-[10px] text-muted-foreground">Stannat</p>
          </div>
          <div>
            <p className="text-lg font-bold text-muted-foreground">{stats.notStarted}</p>
            <p className="text-[10px] text-muted-foreground">Ej start</p>
          </div>
        </div>

        {/* Promise list */}
        <div className="space-y-2">
          {promises.slice(0, 3).map((promise) => (
            <div
              key={promise.id}
              className="p-2 rounded-md border bg-muted/30 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs line-clamp-2">{promise.statement}</p>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[9px] ${getStatusStyles(promise.status)}`}
                >
                  {getStatusIcon(promise.status)}
                  <span className="ml-1">{getStatusLabel(promise.status)}</span>
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {promise.source} · {promise.date}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
