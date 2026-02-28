"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { RebelVotesByTopic } from "@/hooks/useFetchPolitician";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface RebelVotesByTopicCardProps {
  rebelVotesByTopic: RebelVotesByTopic[];
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

export function RebelVotesByTopicCard({
  rebelVotesByTopic,
  partyName,
}: RebelVotesByTopicCardProps) {
  const totalRebelVotes = rebelVotesByTopic.reduce((sum, t) => sum + t.count, 0);

  if (totalRebelVotes === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Avvikande röster
          </CardTitle>
          <InfoButton
            title="Avvikande röster"
            description={`Visar i vilka politikområden ${partyName}-ledamoten oftast röstar annorlunda än partiets majoritet. Detta kan indikera personliga övertygelser eller lokala intressen.`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Röstat annorlunda än {partyName} totalt {totalRebelVotes} gånger
        </p>

        <div className="space-y-3">
          {rebelVotesByTopic.slice(0, 5).map((topicGroup) => (
            <div key={topicGroup.committee} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-normal">
                  {topicGroup.topic}
                </Badge>
                <span className="text-sm font-medium text-amber-600">
                  {topicGroup.count} {topicGroup.count === 1 ? "gång" : "gånger"}
                </span>
              </div>

              {topicGroup.recentVotes.length > 0 && (
                <div className="pl-2 border-l-2 border-amber-500/30 space-y-1">
                  {topicGroup.recentVotes.slice(0, 2).map((vote) => (
                    <a
                      key={vote.voteringId}
                      href={
                        vote.betankandeId
                          ? getRiksdagenBetankandeUrl(vote.betankandeId)
                          : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <span className={`font-medium ${getVoteColor(vote.personVote)}`}>
                        {vote.personVote}
                      </span>
                      <span className="truncate flex-1">
                        {vote.betankandeTitel || vote.subjectTitle || "Votering"}
                      </span>
                      <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
