"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MotionEffectiveness } from "@/hooks/useFetchPolitician";
import { CheckCircle, ChevronRight, ExternalLink, FileText, HelpCircle, Info, XCircle } from "lucide-react";
import Link from "next/link";

interface MotionEffectivenessCardProps {
  motionEffectiveness: MotionEffectiveness;
  onFilterTimeline?: () => void;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Hög säkerhet",
  medium: "Medelhög säkerhet",
  low: "Låg säkerhet",
  very_low: "Mycket låg säkerhet",
};

export function MotionEffectivenessCard({
  motionEffectiveness,
  onFilterTimeline,
}: MotionEffectivenessCardProps) {
  const {
    totalMotions,
    motionsPassed,
    motionsRejected,
    passRate,
    topMotion,
    bifallBreakdown,
    bayesianStats,
  } = motionEffectiveness;

  if (totalMotions === 0) {
    return null;
  }

  const resolvedMotions = motionsPassed + motionsRejected;
  const hasBifallBreakdown =
    bifallBreakdown &&
    (bifallBreakdown.viaReservation > 0 ||
      bifallBreakdown.viaUtskott > 0 ||
      bifallBreakdown.tillkannagivanden > 0);

  // Use Bayesian-adjusted rate if available, otherwise fall back to raw
  const displayRate = bayesianStats?.adjustedPassRate ?? passRate;
  const hasSignificantAdjustment =
    bayesianStats && Math.abs(bayesianStats.rawPassRate - bayesianStats.adjustedPassRate) > 5;

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
            description="Visar hur många av politikerns motioner som bifallits (godkänts) av riksdagen. Motioner kan bifallas via reservation (minoritetsförslag som vinner omröstning) eller via utskottets förslag. Tillkännagivanden är när riksdagen uppmanar regeringen att agera."
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

        {hasBifallBreakdown && motionsPassed > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bifallBreakdown.viaReservation > 0 && (
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-green-500/10 text-green-700"
                  >
                    {bifallBreakdown.viaReservation} via reservation
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Motioner som bifallits genom att en reservation
                    (minoritetsförslag) vann omröstningen
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            {bifallBreakdown.viaUtskott > 0 && (
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-green-500/10 text-green-700"
                  >
                    {bifallBreakdown.viaUtskott} via utskott
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Motioner som bifallits genom utskottets förslag
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            {bifallBreakdown.tillkannagivanden > 0 && (
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-500/10 text-amber-700"
                  >
                    <Info className="size-2.5 mr-0.5" />
                    {bifallBreakdown.tillkannagivanden} tillkännagivanden
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Riksdagen har uppmanat regeringen att agera i enlighet med
                    motionen. Ett tillkännagivande är en stark signal men
                    juridiskt inte bindande.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {resolvedMotions > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">
                  Genomslagskraft
                </span>
                {bayesianStats && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Link
                        href="/om/metodik"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <HelpCircle className="size-3.5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Justerad för att ge en rättvis jämförelse oavsett
                        antal motioner.{" "}
                        {hasSignificantAdjustment && (
                          <span className="text-muted-foreground">
                            Rå: {Math.round(bayesianStats.rawPassRate)}%
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-primary mt-1">
                        Klicka för att läsa mer om vår metodik
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span
                className={`text-lg font-bold ${
                  displayRate >= 10
                    ? "text-green-600"
                    : displayRate >= 5
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                }`}
              >
                {Math.round(displayRate)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(displayRate * 2, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {displayRate >= 10
                  ? "Över genomsnittet för riksdagen"
                  : displayRate >= 5
                    ? "Nära genomsnittet"
                    : "Under genomsnittet"}
              </p>
              {bayesianStats && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 text-muted-foreground"
                >
                  {CONFIDENCE_LABELS[bayesianStats.confidenceTier] ??
                    bayesianStats.confidenceTier}
                </Badge>
              )}
            </div>
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

        {onFilterTimeline && totalMotions > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={onFilterTimeline}
          >
            Visa alla {totalMotions} motioner i aktivitetsflödet
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
