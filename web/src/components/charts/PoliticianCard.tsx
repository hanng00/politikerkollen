"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { UserIcon, MapPinIcon, CalendarIcon, TrendingUpIcon } from "lucide-react";
import { getPartyColor, needsDarkText } from "@/lib/parties";

export interface PoliticianCardProps {
  intressent_id: string;
  tilltalsnamn: string;
  efternamn: string;
  parti: string;
  valkrets: string;
  status: string;
  bild_url_192?: string;
  fodd_ar?: string;
  kon?: string;
  iort?: string;
  assignments?: unknown;
  stats?: {
    attendance_rate?: number;
    party_loyalty?: number;
    total_votes?: number;
    years_in_parliament?: number;
  };
}

function calculateAge(birthYear?: string): number | null {
  if (!birthYear) return null;
  const year = parseInt(birthYear, 10);
  if (isNaN(year)) return null;
  return new Date().getFullYear() - year;
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PoliticianCard({
  tilltalsnamn,
  efternamn,
  parti,
  valkrets,
  status,
  bild_url_192,
  fodd_ar,
  kon,
  iort,
  stats,
}: PoliticianCardProps) {
  const fullName = `${tilltalsnamn} ${efternamn}`;
  const age = calculateAge(fodd_ar);
  const partyColor = getPartyColor(parti);
  const darkText = needsDarkText(parti);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="relative shrink-0">
            {bild_url_192 ? (
              <div className="relative size-20 rounded-lg overflow-hidden bg-muted border border-border/50">
                <Image
                  src={bild_url_192}
                  alt={fullName}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="size-20 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
                <UserIcon className="size-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name and Party */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {fullName}
                </h3>
                <Badge
                  className={`text-xs font-medium ${darkText ? "text-black" : ""}`}
                  style={{ backgroundColor: partyColor }}
                >
                  {parti}
                </Badge>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{valkrets}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">{status}</span>
              </div>
              {(age || kon || iort) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {age && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {age} år
                    </span>
                  )}
                  {kon && <span>• {kon === "kvinna" ? "Kvinna" : "Man"}</span>}
                  {iort && <span>• Född i {iort}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Stats */}
      {stats && (
        <CardContent className="pt-0 border-t border-border/30">
          <div className="grid grid-cols-2 gap-3">
            {stats.attendance_rate !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUpIcon className="size-3" />
                  <span>Närvaro</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatPercentage(stats.attendance_rate)}
                </div>
              </div>
            )}
            {stats.party_loyalty !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Partilojalitet</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatPercentage(stats.party_loyalty)}
                </div>
              </div>
            )}
            {stats.total_votes !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Totalt röster</div>
                <div className="text-sm font-semibold text-foreground">
                  {stats.total_votes.toLocaleString("sv-SE")}
                </div>
              </div>
            )}
            {stats.years_in_parliament !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">År i riksdagen</div>
                <div className="text-sm font-semibold text-foreground">
                  {Math.round(stats.years_in_parliament)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
