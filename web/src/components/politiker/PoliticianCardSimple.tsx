"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PoliticianSummary } from "@/hooks/useFetchPoliticians";
import { getPartyColor, needsDarkText } from "@/lib/parties";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";

export interface PoliticianCardSimpleProps {
  politician: PoliticianSummary;
}

export function PoliticianCardSimple({
  politician,
}: PoliticianCardSimpleProps) {
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;
  const partyColor = getPartyColor(politician.party);
  const darkText = needsDarkText(politician.party);

  const hasMotions = politician.motionStats && politician.motionStats.total > 0;
  const hasGoodPassRate = hasMotions && politician.motionStats!.passRate >= 10;
  const hasRebelPattern = politician.topRebelTopic && politician.topRebelTopic.count >= 3;

  return (
    <Link href={`/politiker/${politician.id}`}>
      <Card
        className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer group"
      >
        <CardContent className="pt-4 h-full">
          <div className="flex items-start gap-3 h-full">
            <Avatar className="size-10 shrink-0">
              {politician.imageUrl && (
                <AvatarImage src={politician.imageUrl} alt={politician.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium truncate">
                  {politician.name}
                </h3>
                <Badge
                  className={`text-[10px] h-4 px-1 shrink-0 ${darkText ? "text-black" : ""}`}
                  style={{ backgroundColor: partyColor }}
                >
                  {politician.party}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {politician.constituency}
              </p>

              {/* Accountability metrics */}
              <div className="mt-auto pt-2 space-y-1">
                {hasMotions ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    {hasGoodPassRate ? (
                      <CheckCircle className="size-3 text-green-500 shrink-0" />
                    ) : (
                      <FileText className="size-3 text-muted-foreground shrink-0" />
                    )}
                    <span className={hasGoodPassRate ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {politician.motionStats!.passRate}% motioner bifallna
                    </span>
                    <span className="text-muted-foreground/60">
                      ({politician.motionStats!.passed}/{politician.motionStats!.total})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="size-3 shrink-0" />
                    <span>Inga motioner</span>
                  </div>
                )}

                {hasRebelPattern && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                    <span className="text-amber-600 truncate">
                      Avviker i {politician.topRebelTopic!.topic.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PoliticianCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="pt-4 h-full">
        <div className="flex items-start gap-3 h-full">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-20 mt-1" />
            <div className="mt-auto pt-2 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
