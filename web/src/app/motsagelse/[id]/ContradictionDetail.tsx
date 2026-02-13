"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  Facebook,
  Flame,
  MessageSquare,
  Quote,
  Share2,
  Twitter,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Contradiction, Politician } from "@/types";
import { CommentSection } from "./CommentSection";
import { RelatedContradictions } from "./RelatedContradictions";
import { getPoliticianById } from "@/mocks/politicians";

interface ContradictionDetailProps {
  contradiction: Contradiction;
  politician: Politician;
  relatedContradictions: Contradiction[];
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function SocialProofBar({
  viewCount,
  shareCount,
  isTrending,
}: {
  viewCount: number;
  shareCount: number;
  isTrending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {isTrending && (
        <div className="flex items-center gap-1 text-destructive font-medium">
          <Flame className="size-3.5" />
          <span>Trending</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <Eye className="size-3.5" />
        <span>{formatCount(viewCount)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Share2 className="size-3.5" />
        <span>{formatCount(shareCount)}</span>
      </div>
    </div>
  );
}

function ShareButtons({ contradiction, politician }: { contradiction: Contradiction; politician: Politician }) {
  const [copied, setCopied] = useState(false);
  const fullName = `${politician.firstName} ${politician.lastName}`;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${fullName} sa: "${contradiction.said.content.slice(0, 100)}..." men ${contradiction.daysApart} dagar senare: ${contradiction.done.content}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">Dela denna motsägelse</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-6 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Twitter className="size-4" />
          Twitter
        </a>
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-6 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Facebook className="size-4" />
          Facebook
        </a>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="size-4" />
              Kopierad!
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Kopiera länk
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ContradictionVisual({
  contradiction,
}: {
  contradiction: Contradiction;
}) {
  return (
    <div className="space-y-6">
      {/* Said section */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-linear-to-b from-warning to-warning/50" />
        <div className="pl-6 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
              <Quote className="size-3" />
              SA
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {contradiction.said.date}
            </span>
          </div>
          <blockquote className="text-xl sm:text-2xl font-serif italic leading-relaxed">
            &ldquo;{contradiction.said.content}&rdquo;
          </blockquote>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            {contradiction.said.source}
            {contradiction.said.sourceUrl && (
              <a
                href={contradiction.said.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </div>
      </div>

      {/* Time gap indicator */}
      <div className="flex items-center gap-4 pl-6">
        <div className="flex-1 h-px bg-linear-to-r from-warning/30 via-muted to-destructive/30" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{contradiction.daysApart} dagar senare</span>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-destructive/30 via-muted to-transparent" />
      </div>

      {/* Done section */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-linear-to-b from-destructive to-destructive/50" />
        <div className="pl-6 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
              <Vote className="size-3" />
              GJORDE
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {contradiction.done.date}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-semibold leading-relaxed">
            {contradiction.done.content}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            {contradiction.done.source}
            {contradiction.done.sourceUrl && (
              <a
                href={contradiction.done.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function PoliticianHeader({ politician }: { politician: Politician }) {
  const fullName = `${politician.firstName} ${politician.lastName}`;
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;

  return (
    <Link
      href={`/politiker/${politician.id}`}
      className="group flex items-center gap-4 p-4 -m-4 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <Avatar size="lg">
        <AvatarImage src={politician.imageUrl} alt={fullName} />
        <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
          {fullName}
        </h2>
        <p className="text-sm text-muted-foreground">
          {politician.party.name} · {politician.constituency}
        </p>
      </div>
      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function VoteSection() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [count, setCount] = useState(127);

  const handleVote = (direction: "up" | "down") => {
    if (vote === direction) {
      setVote(null);
      setCount((c) => (direction === "up" ? c - 1 : c + 1));
    } else {
      if (vote) {
        setCount((c) => (direction === "up" ? c + 2 : c - 2));
      } else {
        setCount((c) => (direction === "up" ? c + 1 : c - 1));
      }
      setVote(direction);
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      <button
        onClick={() => handleVote("up")}
        className={cn(
          "p-2 rounded-md transition-colors",
          vote === "up"
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="Rösta upp"
      >
        <ChevronUp className="size-5" />
      </button>
      <span className="min-w-[3ch] text-center font-medium text-sm">{count}</span>
      <button
        onClick={() => handleVote("down")}
        className={cn(
          "p-2 rounded-md transition-colors",
          vote === "down"
            ? "text-destructive bg-destructive/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="Rösta ner"
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  );
}

export function ContradictionDetail({
  contradiction,
  politician,
  relatedContradictions,
}: ContradictionDetailProps) {
  const timeAgo = formatDistanceToNow(new Date(contradiction.createdAt), {
    addSuffix: true,
    locale: sv,
  });

  return (
    <main className="page-container-narrow py-8 space-y-8 min-w-0 overflow-x-clip">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto">
        <Link href="/" className="hover:text-foreground transition-colors shrink-0">
          Motsägelser
        </Link>
        <span className="shrink-0">/</span>
        <Link
          href={`/politiker/${politician.id}`}
          className="hover:text-foreground transition-colors shrink-0"
        >
          {politician.firstName} {politician.lastName}
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground truncate">{contradiction.topic.name}</span>
      </nav>

      {/* Main card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Header with politician */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{contradiction.topic.name}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              <SocialProofBar
                viewCount={contradiction.viewCount}
                shareCount={contradiction.shareCount}
                isTrending={contradiction.isTrending}
              />
            </div>
            <PoliticianHeader politician={politician} />
          </div>

          <Separator />

          {/* The contradiction itself */}
          <ContradictionVisual contradiction={contradiction} />

          <Separator />

          {/* Actions: Vote + Share */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <VoteSection />
            <ShareButtons contradiction={contradiction} politician={politician} />
          </div>
        </CardContent>
      </Card>

      {/* Comments section */}
      <CommentSection contradictionId={contradiction.id} />

      {/* Related contradictions */}
      {relatedContradictions.length > 0 && (
        <RelatedContradictions contradictions={relatedContradictions} />
      )}

      {/* Call to action footer */}
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">
          Vill du se fler motsägelser från {politician.firstName} {politician.lastName}?
        </p>
        <Link
          href={`/politiker/${politician.id}`}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          Visa politikerprofil
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </main>
  );
}
