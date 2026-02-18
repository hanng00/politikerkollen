"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { TopicActivity } from "@/hooks/useFetchPolitician";
import { MessageSquare, TrendingUp, Vote } from "lucide-react";

interface TopTopicsCardProps {
  topTopics: TopicActivity[];
}

export function TopTopicsCard({ topTopics }: TopTopicsCardProps) {
  if (topTopics.length === 0) {
    return null;
  }

  const maxCount = topTopics[0]?.totalCount ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Mest aktiv inom
          </CardTitle>
          <InfoButton
            title="Mest aktiv inom"
            description="Visar vilka politikområden politikern är mest engagerad i, baserat på antal röster och anföranden inom varje riksdagsutskott."
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topTopics.map((topic, index) => {
          const widthPercent = Math.max(
            20,
            (topic.totalCount / maxCount) * 100,
          );

          return (
            <div key={topic.committee} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {topic.topic}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Vote className="size-3" />
                    {topic.voteCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {topic.speechCount}
                  </span>
                </div>
              </div>
              <div className="ml-6 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
