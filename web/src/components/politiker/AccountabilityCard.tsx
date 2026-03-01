"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { AccountabilityStats } from "@/hooks/useFetchPolitician";
import { ChevronRight, ExternalLink, HelpCircle, MessageSquareMore } from "lucide-react";

interface AccountabilityCardProps {
  accountabilityStats: AccountabilityStats;
  onFilterTimeline?: () => void;
}

function getRiksdagenDocumentUrl(dokId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_${dokId.toLowerCase()}/`;
}

export function AccountabilityCard({
  accountabilityStats,
  onFilterTimeline,
}: AccountabilityCardProps) {
  const { interpellations, writtenQuestions, totalQuestions, recentQuestions } =
    accountabilityStats;

  if (totalQuestions === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <HelpCircle className="size-4 text-muted-foreground" />
            Granskar regeringen
          </CardTitle>
          <InfoButton
            title="Granskar regeringen"
            description="Visar hur aktivt politikern granskar regeringen genom interpellationer (längre debatter med ministrar) och skriftliga frågor (kortare frågor som besvaras skriftligt). Detta är ett viktigt verktyg för riksdagsledamöter att utkräva ansvar."
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{interpellations}</p>
            <p className="text-xs text-muted-foreground">Interpellationer</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{writtenQuestions}</p>
            <p className="text-xs text-muted-foreground">Skriftliga frågor</p>
          </div>
        </div>

        {recentQuestions.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Senaste frågor</p>
            <div className="space-y-2">
              {recentQuestions.slice(0, 3).map((question) => (
                <a
                  key={question.dokId}
                  href={getRiksdagenDocumentUrl(question.dokId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 text-sm hover:text-primary transition-colors"
                >
                  <MessageSquareMore className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 group-hover:underline">
                      {question.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {question.type === "interpellation"
                          ? "Interpellation"
                          : "Skriftlig fråga"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(question.date).toLocaleDateString("sv-SE")}
                      </span>
                      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {onFilterTimeline && totalQuestions > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={onFilterTimeline}
          >
            Visa alla {totalQuestions} frågor i aktivitetsflödet
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
