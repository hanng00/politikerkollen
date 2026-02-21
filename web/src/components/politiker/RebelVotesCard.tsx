"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RebelVote } from "@/hooks/useFetchPolitician";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";

interface RebelVotesCardProps {
  rebelVotes: RebelVote[];
  partyName: string;
}

interface RebelVoteGroup {
  betankandeId: string | null;
  betankandeTitel: string | null;
  topic: string | null;
  date: string;
  votes: RebelVote[];
}

function groupRebelVotes(votes: RebelVote[]): RebelVoteGroup[] {
  const grouped = new Map<string, RebelVoteGroup>();
  const ungrouped: RebelVoteGroup[] = [];

  for (const vote of votes) {
    if (vote.betankandeId) {
      const existing = grouped.get(vote.betankandeId);
      if (existing) {
        existing.votes.push(vote);
        if (vote.date > existing.date) existing.date = vote.date;
      } else {
        grouped.set(vote.betankandeId, {
          betankandeId: vote.betankandeId,
          betankandeTitel: vote.betankandeTitel,
          topic: vote.topic,
          date: vote.date,
          votes: [vote],
        });
      }
    } else {
      ungrouped.push({
        betankandeId: null,
        betankandeTitel: vote.subjectTitle,
        topic: vote.topic,
        date: vote.date,
        votes: [vote],
      });
    }
  }

  return [...Array.from(grouped.values()), ...ungrouped].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

function getRiksdagenBetankandeUrl(betankandeId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${betankandeId.toLowerCase()}/`;
}

function getVoteColor(vote: string): string {
  switch (vote) {
    case "Ja":
      return "text-green-500";
    case "Nej":
      return "text-red-500";
    case "Avstår":
      return "text-yellow-500";
    default:
      return "text-muted-foreground";
  }
}

function RebelVoteGroupItem({
  group,
  partyName,
}: {
  group: RebelVoteGroup;
  partyName: string;
}) {
  const [open, setOpen] = useState(false);
  const date = new Date(group.date).toLocaleDateString("sv-SE");
  const hasMultipleVotes = group.votes.length > 1;

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{date}</span>
          {group.topic && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-normal"
            >
              {group.topic}
            </Badge>
          )}
          {hasMultipleVotes && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-normal bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              {group.votes.length} voteringar
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium line-clamp-2">
          {group.betankandeTitel ??
            group.votes[0]?.subjectTitle ??
            "Votering"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {group.betankandeId && (
          <a
            href={getRiksdagenBetankandeUrl(group.betankandeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" />
          </a>
        )}
        {hasMultipleVotes && (
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>
    </div>
  );

  if (!hasMultipleVotes) {
    const vote = group.votes[0];
    return (
      <div className="border-l-2 border-amber-500/50 pl-3 py-1 space-y-1.5">
        {header}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Röstade</span>
          <span className={`font-medium ${getVoteColor(vote.personVote)}`}>
            {vote.personVote}
          </span>
          <span className="text-muted-foreground">
            ({partyName} röstade {vote.partyMajorityVote})
          </span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="border-l-2 border-amber-500/50 pl-3 py-1 space-y-1.5 cursor-pointer hover:border-amber-500 transition-colors">
          {header}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l-2 border-amber-500/50 pl-3 pb-2 space-y-1">
          {group.votes.map((vote, i) => (
            <div
              key={`${vote.voteringId}-${i}`}
              className="flex items-center gap-2 text-xs flex-wrap"
            >
              {vote.subjectTitle && vote.subjectTitle !== group.betankandeTitel && (
                <span
                  className="text-muted-foreground truncate max-w-[160px]"
                  title={vote.subjectTitle}
                >
                  {vote.subjectTitle}
                </span>
              )}
              <span className="text-muted-foreground">Röstade</span>
              <span className={`font-medium ${getVoteColor(vote.personVote)}`}>
                {vote.personVote}
              </span>
              <span className="text-muted-foreground">
                ({partyName}: {vote.partyMajorityVote})
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RebelVotesCard({ rebelVotes, partyName }: RebelVotesCardProps) {
  if (rebelVotes.length === 0) {
    return null;
  }

  const groups = groupRebelVotes(rebelVotes);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Röstade annorlunda
          </CardTitle>
          <InfoButton
            title="Röstade annorlunda"
            description={`Visar de senaste tillfällena där politikern röstade annorlunda än majoriteten av ${partyName}. Detta kan bero på personlig övertygelse, lokala intressen eller andra faktorer.`}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          Senaste avvikelser från {partyName}s majoritet
        </p>
        <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1 -mr-1">
          {groups.map((group, i) => (
            <RebelVoteGroupItem
              key={group.betankandeId ?? `ungrouped-${i}`}
              group={group}
              partyName={partyName}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
