"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TopicStats } from "@/types";

interface TopicBreakdownProps {
  topics: TopicStats[];
}

function getConsistencyColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function TopicBreakdown({ topics }: TopicBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Konsekvens per ämne</CardTitle>
        <CardDescription className="text-xs">
          Hur ofta ord matchar handling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {topics.map((topicStat) => (
          <div key={topicStat.topic.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{topicStat.topic.name}</span>
              <span className={`font-semibold ${getConsistencyColor(topicStat.consistencyScore)}`}>
                {topicStat.consistencyScore}%
              </span>
            </div>
            <Progress value={topicStat.consistencyScore} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
