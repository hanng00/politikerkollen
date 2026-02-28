"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PoliticianDetail } from "@/hooks/useFetchPolitician";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

interface HighlightsCardProps {
  politician: PoliticianDetail;
}

interface Highlight {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  type: "positive" | "neutral" | "notable";
}

function generateHighlights(politician: PoliticianDetail): Highlight[] {
  const highlights: Highlight[] = [];
  const { motionEffectiveness, partyLoyalty, rebelVotesByTopic, topTopics } = politician;

  // Motion effectiveness - the most meaningful metric
  if (motionEffectiveness.motionsPassed > 0) {
    highlights.push({
      icon: CheckCircle,
      text: `${motionEffectiveness.motionsPassed} av ${motionEffectiveness.totalMotions} motioner har bifallits av riksdagen`,
      type: "positive",
    });
  } else if (motionEffectiveness.totalMotions > 10 && motionEffectiveness.motionsPassed === 0) {
    highlights.push({
      icon: XCircle,
      text: `Ingen av ${motionEffectiveness.totalMotions} motioner har bifallits`,
      type: "notable",
    });
  }

  // Rebel voting patterns - show the pattern, not just the count
  const totalRebelVotes = rebelVotesByTopic.reduce((sum, t) => sum + t.count, 0);
  if (totalRebelVotes > 0 && rebelVotesByTopic.length > 0) {
    const topRebelTopic = rebelVotesByTopic[0];
    if (topRebelTopic.count >= 3) {
      highlights.push({
        icon: AlertTriangle,
        text: `Röstar ofta annorlunda än ${politician.party} i ${topRebelTopic.topic.toLowerCase()} (${topRebelTopic.count} gånger)`,
        type: "notable",
      });
    }
  }

  // Party loyalty - only if extreme
  if (partyLoyalty.loyaltyPercentage >= 99 && partyLoyalty.totalVotes > 100) {
    highlights.push({
      icon: Users,
      text: `Röstar nästan alltid med partilinjen (${partyLoyalty.loyaltyPercentage}%)`,
      type: "neutral",
    });
  } else if (partyLoyalty.loyaltyPercentage < 85 && partyLoyalty.totalVotes > 100) {
    highlights.push({
      icon: Users,
      text: `Mer oberoende röstare än de flesta (${partyLoyalty.loyaltyPercentage}% med partiet)`,
      type: "notable",
    });
  }

  // Top topic - only if clearly dominant
  if (topTopics.length > 0) {
    const topTopic = topTopics[0];
    const secondTopic = topTopics[1];
    if (!secondTopic || topTopic.totalCount > secondTopic.totalCount * 1.5) {
      highlights.push({
        icon: FileText,
        text: `Mest engagerad i ${topTopic.topic.toLowerCase()}`,
        type: "neutral",
      });
    }
  }

  return highlights.slice(0, 3);
}

const typeStyles = {
  positive: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
  notable: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

export function HighlightsCard({ politician }: HighlightsCardProps) {
  const highlights = generateHighlights(politician);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Sammanfattning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {highlights.map((highlight, index) => {
          const Icon = highlight.icon;
          return (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-md border ${typeStyles[highlight.type]}`}
            >
              <Icon className="size-4 mt-0.5 shrink-0" />
              <p className="text-sm">{highlight.text}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
