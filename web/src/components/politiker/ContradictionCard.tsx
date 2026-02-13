"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Flame,
  MessageSquare,
  Quote,
  Share2,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useComments } from "@/hooks/useComments";
import type { Contradiction, Politician } from "@/types";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { ShareDialog } from "./ShareDialog";

interface ContradictionCardProps {
  contradiction: Contradiction;
  politician: Pick<
    Politician,
    "firstName" | "lastName" | "imageUrl" | "party" | "constituency"
  >;
  featured?: boolean;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function ActionPill({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground transition-colors",
        onClick && "hover:bg-muted hover:text-foreground cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function ContradictionCard({
  contradiction,
  politician,
  featured = false,
}: ContradictionCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const fullName = `${politician.firstName} ${politician.lastName}`;
  const { totalCount } = useComments(contradiction.id, null);

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden group",
          featured && "border-destructive/30"
        )}
      >
        {/* Clickable area linking to dedicated page */}
        <Link href={`/motsagelse/${contradiction.id}`} className="block">
          {/* Header with politician info */}
          <CardHeader className="pb-3 bg-linear-to-r from-destructive/5 to-transparent group-hover:from-destructive/10 transition-colors">
            <div className="flex min-w-0 items-start justify-between gap-2 sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <PoliticianAvatar politician={politician} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate group-hover:text-primary transition-colors">
                      {fullName}
                    </span>
                    {featured && (
                      <Badge variant="destructive" className="text-[9px] h-4">
                        <Flame className="size-2.5 mr-0.5" />
                        Trending
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {politician.party.name} · {politician.constituency}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {contradiction.topic.name}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-2">
            {/* The contradiction */}
            <div className="grid gap-3">
              {/* Said */}
              <div className="relative pl-4 border-l-2 border-warning">
                <div className="absolute -left-1.5 top-0 size-3 rounded-full bg-warning flex items-center justify-center">
                  <Quote className="size-1.5 text-warning-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  SA — {contradiction.said.date}
                </p>
                <p className="text-sm italic">
                  &quot;{contradiction.said.content}&quot;
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {contradiction.said.source}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 pl-4">
                <div className="flex-1 h-px bg-linear-to-r from-warning/50 to-destructive/50" />
                <span className="text-[10px] text-muted-foreground">
                  {contradiction.daysApart} dagar senare
                </span>
                <div className="flex-1 h-px bg-linear-to-r from-destructive/50 to-destructive/20" />
              </div>

              {/* Done */}
              <div className="relative pl-4 border-l-2 border-destructive">
                <div className="absolute -left-1.5 top-0 size-3 rounded-full bg-destructive flex items-center justify-center">
                  <Vote className="size-1.5 text-destructive-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  GJORDE — {contradiction.done.date}
                </p>
                <p className="text-sm font-medium">
                  {contradiction.done.content}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {contradiction.done.source}
                </p>
              </div>
            </div>
          </CardContent>
        </Link>

        {/* Action bar - outside the link so clicks work independently */}
        <CardContent className="pt-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upvote/Downvote pill */}
            <ActionPill className="gap-0.5 px-2">
              <button
                className="p-0.5 hover:text-primary transition-colors"
                aria-label="Rösta upp"
              >
                <ChevronUp className="size-4" />
              </button>
              <span className="font-medium min-w-[2ch] text-center">
                {formatCount(contradiction.viewCount)}
              </span>
              <button
                className="p-0.5 hover:text-destructive transition-colors"
                aria-label="Rösta ner"
              >
                <ChevronDown className="size-4" />
              </button>
            </ActionPill>

            {/* Comments pill - links to dedicated page */}
            <Link href={`/motsagelse/${contradiction.id}#comments`}>
              <ActionPill className="hover:bg-muted hover:text-foreground cursor-pointer">
                <MessageSquare className="size-4" />
                <span>{formatCount(totalCount)}</span>
              </ActionPill>
            </Link>

            {/* Views pill */}
            <ActionPill>
              <Eye className="size-4" />
              <span>{formatCount(contradiction.viewCount)}</span>
            </ActionPill>

            {/* Share pill */}
            <ActionPill onClick={() => setShowShareDialog(true)}>
              <Share2 className="size-4" />
              <span>Dela</span>
            </ActionPill>
          </div>
        </CardContent>
      </Card>

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        contradiction={contradiction}
        politician={politician}
      />
    </>
  );
}
