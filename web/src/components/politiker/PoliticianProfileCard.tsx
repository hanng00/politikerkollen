"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianDetail } from "@/hooks/useFetchPolitician";
import { getPartyColor, needsDarkText } from "@/lib/parties";
import { Calendar, ExternalLink, Mail, MapPin, Share2 } from "lucide-react";

interface PoliticianProfileCardProps {
  politician: PoliticianDetail;
}

function getActivityYears(
  firstDate: string | null,
  lastDate: string | null,
): string {
  if (!firstDate) return "";
  const startYear = new Date(firstDate).getFullYear();
  const endYear = lastDate
    ? new Date(lastDate).getFullYear()
    : new Date().getFullYear();
  if (startYear === endYear) return `${startYear}`;
  return `${startYear}–${endYear}`;
}

export function PoliticianProfileCard({
  politician,
}: PoliticianProfileCardProps) {
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;
  const partyColor = getPartyColor(politician.party);
  const darkText = needsDarkText(politician.party);
  const activityYears = getActivityYears(
    politician.firstActionDate,
    politician.lastActionDate,
  );

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${politician.name} (${politician.party}) — Se aktivitet i riksdagen`;

    if (navigator.share) {
      try {
        await navigator.share({ title: politician.name, text, url });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Fråga till ${politician.name}`);
    const body = encodeURIComponent(
      `Hej ${politician.firstName},\n\nJag skriver till dig som din väljare.\n\n[Skriv ditt meddelande här]\n\nMed vänliga hälsningar`,
    );
    // Note: We don't have actual email addresses, so this opens a template
    // In a real implementation, this would link to riksdagen.se contact form
    window.open(
      `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/${politician.id}`,
      "_blank",
    );
  };

  const slugify = (text: string) => text.toLowerCase().replace(/ /g, "-");
  const politicianSlug = `${slugify(politician.firstName)}-${slugify(politician.lastName)}-${politician.sourceId}`;
  const RIKSDAGEN_POLITICIAN_URL = `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/${politicianSlug}`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div 
            className="ring-4 rounded-full p-0.5 mb-4"
            style={{ boxShadow: `0 0 0 4px ${partyColor}30` }}
          >
            <Avatar className="size-24">
              {politician.imageUrl && (
                <AvatarImage src={politician.imageUrl} alt={politician.name} />
              )}
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{politician.name}</h1>
            <Badge 
              className={darkText ? "text-black" : ""}
              style={{ backgroundColor: partyColor }}
            >
              {politician.party}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">{politician.status}</p>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {politician.constituency}
            </span>
            {politician.birthYear && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                f. {politician.birthYear}
              </span>
            )}
            {activityYears && (
              <span className="text-xs">Aktiv {activityYears}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleEmail}
          >
            <Mail className="size-4 mr-2" />
            Kontakta {politician.firstName}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleShare}
          >
            <Share2 className="size-4 mr-2" />
            Dela profilen
          </Button>
          <a
            href={RIKSDAGEN_POLITICIAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-start gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            <ExternalLink className="size-4" />
            Riksdagen.se
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
