"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { RebelVote } from "@/hooks/useFetchPolitician";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface RebelVotesCardProps {
  rebelVotes: RebelVote[];
  partyName: string;
}

function getRiksdagenBetankandeUrl(betankandeId: string): string {
  // Using underscore prefix without slug - Riksdagen redirects to the full URL with slug
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

export function RebelVotesCard({ rebelVotes, partyName }: RebelVotesCardProps) {
  if (rebelVotes.length === 0) {
    return null;
  }

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
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Senaste avvikelser från {partyName}s majoritet
        </p>

        {rebelVotes.map((vote, index) => {
          const date = new Date(vote.date).toLocaleDateString("sv-SE");

          return (
            <div
              key={`${vote.voteringId}-${index}`}
              className="border-l-2 border-amber-500/50 pl-3 py-1 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{date}</span>
                  {vote.topic && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {vote.topic}
                    </Badge>
                  )}
                </div>
                {vote.betankandeId && (
                  <a
                    href={getRiksdagenBetankandeUrl(vote.betankandeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              <p className="text-sm font-medium line-clamp-1">
                {vote.subjectTitle || vote.betankandeTitel || "Votering"}
              </p>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Röstade</span>
                <span
                  className={`font-medium ${getVoteColor(vote.personVote)}`}
                >
                  {vote.personVote}
                </span>
                <span className="text-muted-foreground">
                  ({partyName} röstade {vote.partyMajorityVote})
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
