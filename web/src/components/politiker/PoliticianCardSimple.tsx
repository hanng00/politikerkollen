"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianSummary } from "@/hooks/useFetchPoliticians";
import { ChevronRight, FileText, MessageSquare, Vote } from "lucide-react";
import Link from "next/link";

// Party colors for badge styling
const partyColors: Record<string, string> = {
  S: "bg-[#E8112d]",
  M: "bg-[#52BDEC]",
  SD: "bg-[#DDDD00] text-black",
  C: "bg-[#009933]",
  V: "bg-[#DA291C]",
  KD: "bg-[#000077]",
  L: "bg-[#006AB3]",
  MP: "bg-[#83CF39] text-black",
};

interface PoliticianCardSimpleProps {
  politician: PoliticianSummary;
}

export function PoliticianCardSimple({
  politician,
}: PoliticianCardSimpleProps) {
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;
  const partyColor = partyColors[politician.party] ?? "bg-muted";

  return (
    <Link href={`/politiker/${politician.id}`}>
      <Card className="hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer group">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              {politician.imageUrl && (
                <AvatarImage src={politician.imageUrl} alt={politician.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium truncate">
                  {politician.name}
                </h3>
                <Badge className={`text-[10px] h-4 px-1 ${partyColor}`}>
                  {politician.party}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {politician.constituency}
              </p>

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Vote className="size-3" />
                  {politician.stats.totalVotes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {politician.stats.totalSpeeches}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3" />
                  {politician.stats.totalAuthored}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
