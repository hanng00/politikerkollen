"use client";

import Link from "next/link";
import { ArrowRight, Eye, Flame, Share2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Contradiction } from "@/types";
import { getPoliticianById } from "@/mocks/politicians";

interface RelatedContradictionsProps {
  contradictions: Contradiction[];
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function RelatedCard({ contradiction }: { contradiction: Contradiction }) {
  const politician = getPoliticianById(contradiction.politicianId);
  if (!politician) return null;

  const fullName = `${politician.firstName} ${politician.lastName}`;
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;

  return (
    <Link
      href={`/motsagelse/${contradiction.id}`}
      className="group block"
    >
      <Card className="h-full overflow-hidden hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar size="sm">
                <AvatarImage src={politician.imageUrl} alt={fullName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {politician.party.shortName}
                </p>
              </div>
            </div>
            {contradiction.isTrending && (
              <Flame className="size-4 text-destructive shrink-0" />
            )}
          </div>

          {/* Content preview */}
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-warning font-medium">SA: </span>
              <span className="text-muted-foreground line-clamp-2 italic">
                &ldquo;{contradiction.said.content}&rdquo;
              </span>
            </div>
            <div className="text-xs">
              <span className="text-destructive font-medium">GJORDE: </span>
              <span className="text-muted-foreground line-clamp-1">
                {contradiction.done.content}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className="text-[10px]">
              {contradiction.topic.name}
            </Badge>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Eye className="size-3" />
                {formatCount(contradiction.viewCount)}
              </span>
              <span className="flex items-center gap-0.5">
                <Share2 className="size-3" />
                {formatCount(contradiction.shareCount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function RelatedContradictions({
  contradictions,
}: RelatedContradictionsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Relaterade motsägelser</h3>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Visa alla
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contradictions.map((contradiction) => (
          <RelatedCard key={contradiction.id} contradiction={contradiction} />
        ))}
      </div>
    </section>
  );
}
