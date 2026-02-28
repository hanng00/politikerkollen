"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { MotionEffectiveness } from "@/hooks/useFetchPolitician";
import { CheckCircle, ExternalLink, FileText, XCircle } from "lucide-react";

interface MotionEffectivenessCardProps {
  motionEffectiveness: MotionEffectiveness;
}

export function MotionEffectivenessCard({
  motionEffectiveness,
}: MotionEffectivenessCardProps) {
  const { totalMotions, motionsPassed, motionsRejected, passRate, topMotion } =
    motionEffectiveness;

  if (totalMotions === 0) {
    return null;
  }

  const resolvedMotions = motionsPassed + motionsRejected;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Motioner
          </CardTitle>
          <InfoButton
            title="Motioner"
            description="Visar hur många av politikerns motioner som bifallits (godkänts) av riksdagen. En hög andel bifallna motioner indikerar att politikern driver frågor som får gehör."
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalMotions}</p>
            <p className="text-xs text-muted-foreground">Totalt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{motionsPassed}</p>
            <p className="text-xs text-muted-foreground">Bifallna</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{motionsRejected}</p>
            <p className="text-xs text-muted-foreground">Avslagna</p>
          </div>
        </div>

        {resolvedMotions > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Genomslagskraft
              </span>
              <span
                className={`text-lg font-bold ${
                  passRate >= 10
                    ? "text-green-600"
                    : passRate >= 5
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                }`}
              >
                {passRate}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(passRate * 2, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {passRate >= 10
                ? "Över genomsnittet för riksdagen"
                : passRate >= 5
                  ? "Nära genomsnittet"
                  : "Under genomsnittet"}
            </p>
          </div>
        )}

        {topMotion && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Mest betydelsefulla motion
            </p>
            <a
              href={`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_${topMotion.dokId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {topMotion.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {topMotion.outcome === "bifall" ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-700 text-[10px]"
                  >
                    <CheckCircle className="size-3 mr-1" />
                    Bifallen
                  </Badge>
                ) : topMotion.outcome === "avslag" ? (
                  <Badge
                    variant="secondary"
                    className="bg-red-500/10 text-red-700 text-[10px]"
                  >
                    <XCircle className="size-3 mr-1" />
                    Avslagen
                  </Badge>
                ) : null}
                <ExternalLink className="size-3 text-muted-foreground" />
              </div>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
