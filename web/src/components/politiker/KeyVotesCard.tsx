"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { KeyVote } from "@/hooks/useFetchPolitician";
import { AlertTriangle, ExternalLink, Vote } from "lucide-react";

interface KeyVotesCardProps {
  keyVotes: KeyVote[];
  partyName: string;
}

function getVoteColor(vote: string): string {
  switch (vote) {
    case "Ja":
      return "text-green-600";
    case "Nej":
      return "text-red-500";
    case "Avstår":
      return "text-yellow-600";
    default:
      return "text-muted-foreground";
  }
}

function getRiksdagenBetankandeUrl(betankandeId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${betankandeId.toLowerCase()}/`;
}

export function KeyVotesCard({ keyVotes, partyName }: KeyVotesCardProps) {
  if (keyVotes.length === 0) {
    return null;
  }

  const rebelVotes = keyVotes.filter((v) => v.isRebel);
  const importantVotes = keyVotes.filter((v) => !v.isRebel).slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Vote className="size-4 text-muted-foreground" />
            Viktiga röstningar
          </CardTitle>
          <InfoButton
            title="Viktiga röstningar"
            description="Visar röstningar i tunga utskott (Finans, Konstitution, Försvar, Justitie) samt tillfällen där politikern röstade annorlunda än sitt parti."
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rebelVotes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="size-3 text-amber-500" />
              Röstade annorlunda än {partyName}
            </p>
            <div className="space-y-2">
              {rebelVotes.slice(0, 3).map((vote) => (
                <a
                  key={vote.voteringId}
                  href={getRiksdagenBetankandeUrl(vote.betankandeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-start gap-2 p-2 rounded-md border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {vote.betankandeTitel}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {new Date(vote.date).toLocaleDateString("sv-SE")}
                        </span>
                        {vote.topic && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {vote.topic}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          Röstade{" "}
                          <span className={getVoteColor(vote.voteValue)}>
                            {vote.voteValue}
                          </span>
                          {vote.partyMajorityVote && (
                            <span>
                              {" "}
                              ({partyName}: {vote.partyMajorityVote})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="size-3 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {importantVotes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Röstningar i tunga utskott
            </p>
            <div className="space-y-1.5">
              {importantVotes.map((vote) => (
                <a
                  key={vote.voteringId}
                  href={getRiksdagenBetankandeUrl(vote.betankandeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
                >
                  <span className={`font-medium w-8 ${getVoteColor(vote.voteValue)}`}>
                    {vote.voteValue}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground">
                    {vote.betankandeTitel}
                  </span>
                  {vote.topic && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                    >
                      {vote.topic}
                    </Badge>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
