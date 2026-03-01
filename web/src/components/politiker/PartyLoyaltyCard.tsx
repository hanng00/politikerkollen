"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import { Progress } from "@/components/ui/progress";
import type { PartyLoyalty } from "@/hooks/useFetchPolitician";
import { Users } from "lucide-react";

interface PartyLoyaltyCardProps {
  partyLoyalty: PartyLoyalty;
  partyName: string;
}

export function PartyLoyaltyCard({
  partyLoyalty,
  partyName,
}: PartyLoyaltyCardProps) {
  if (partyLoyalty.totalVotes === 0) {
    return null;
  }

  const loyaltyColor =
    partyLoyalty.loyaltyPercentage >= 90
      ? "text-green-600"
      : partyLoyalty.loyaltyPercentage >= 70
        ? "text-yellow-600"
        : "text-muted-foreground";

  const loyaltyLabel =
    partyLoyalty.loyaltyPercentage >= 95
      ? "Mycket lojal"
      : partyLoyalty.loyaltyPercentage >= 85
        ? "Lojal"
        : partyLoyalty.loyaltyPercentage >= 70
          ? "Måttligt lojal"
          : "Oberoende röstare";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Partilojalitet
          </CardTitle>
          <InfoButton
            title="Partilojalitet"
            description={`Visar hur ofta politikern röstar samma som majoriteten av ${partyName}. För varje votering jämförs politikerns röst med hur de flesta i partiet röstade.`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Röstar med {partyName}
          </span>
          <span className={`text-2xl font-bold ${loyaltyColor}`}>
            {partyLoyalty.loyaltyPercentage}%
          </span>
        </div>

        <Progress value={partyLoyalty.loyaltyPercentage} className="h-2" />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{loyaltyLabel}</span>
          <span>
            {partyLoyalty.votesWithParty.toLocaleString()} av{" "}
            {partyLoyalty.totalVotes.toLocaleString()} röster
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
