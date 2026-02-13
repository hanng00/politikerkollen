"use client";

import { Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PoliticianWithStats } from "@/types";
import { PoliticianAvatar } from "./PoliticianAvatar";

interface CompareSectionProps {
  currentPolitician: PoliticianWithStats;
  similarPoliticians: PoliticianWithStats[];
  onSelectPolitician?: (id: string) => void;
}

export function CompareSection({
  currentPolitician,
  similarPoliticians,
  onSelectPolitician,
}: CompareSectionProps) {
  const fullName = `${currentPolitician.firstName} ${currentPolitician.lastName}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="size-4" />
          Jämför med andra i {currentPolitician.party.shortName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Current politician highlighted */}
          <div className="flex items-center gap-3 p-2 rounded-md bg-primary/5 border border-primary/20">
            <PoliticianAvatar politician={currentPolitician} size="sm" />
            <div className="flex-1">
              <p className="text-xs font-medium">{fullName}</p>
              <p className="text-[10px] text-muted-foreground">Du tittar på</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              #{currentPolitician.stats.consistencyRank}
            </Badge>
          </div>

          {/* Similar politicians */}
          {similarPoliticians.map((p) => {
            const pFullName = `${p.firstName} ${p.lastName}`;
            const isBetter = p.stats.consistencyRank < currentPolitician.stats.consistencyRank;

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelectPolitician?.(p.id)}
              >
                <PoliticianAvatar politician={p} size="sm" />
                <div className="flex-1">
                  <p className="text-xs font-medium">{pFullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.party.shortName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    isBetter
                      ? "text-success border-success/30"
                      : "text-destructive border-destructive/30"
                  }`}
                >
                  #{p.stats.consistencyRank}
                </Badge>
              </div>
            );
          })}
        </div>

        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
          Se hela rankinglistan
          <ChevronRight className="size-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
