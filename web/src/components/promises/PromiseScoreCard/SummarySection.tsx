import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Shield,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";

export function SummarySection({ score }: { score: PromiseScore }) {
  const partyName = getPartyName(score.promise_party);
  const supportedCount = score.motion_supported_count + score.motion_bifall_count;
  const opposedCount = score.motion_opposed_count;
  const adoptedCount = score.proposition_count + score.motion_bifall_count;
  const totalRelevant = supportedCount + opposedCount + score.proposition_count;

  // Determine overall assessment
  let assessmentIcon: React.ReactNode;
  let assessmentLabel: string;
  let assessmentColor: string;

  if (supportedCount > 0 && opposedCount > 0 && opposedCount >= supportedCount * 0.25) {
    assessmentIcon = <AlertTriangle className="size-6 text-amber-500" />;
    assessmentLabel = "Motsägelsefullt agerande";
    assessmentColor = "var(--color-warning)";
  } else if (score.proposition_count > 0) {
    assessmentIcon = <CheckCircle2 className="size-6 text-success" />;
    assessmentLabel = "Löftet har genomförts";
    assessmentColor = "var(--color-success)";
  } else if (totalRelevant === 0) {
    assessmentIcon = <HelpCircle className="size-6 text-muted-foreground" />;
    assessmentLabel = "Otillräckligt underlag";
    assessmentColor = "var(--color-muted)";
  } else if (supportedCount > opposedCount * 2) {
    if (adoptedCount > 0) {
      assessmentIcon = <CheckCircle2 className="size-6 text-teal-500" />;
      assessmentLabel = "Delvis genomfört";
      assessmentColor = "oklch(0.72 0.15 175)";
    } else {
      assessmentIcon = <Shield className="size-6 text-blue-500" />;
      assessmentLabel = "Partiet drev frågan";
      assessmentColor = "oklch(0.65 0.15 250)";
    }
  } else if (opposedCount > supportedCount * 2) {
    assessmentIcon = <XCircle className="size-6 text-destructive" />;
    assessmentLabel = "Partiet röstade emot";
    assessmentColor = "var(--color-destructive)";
  } else {
    assessmentIcon = <HelpCircle className="size-6 text-muted-foreground" />;
    assessmentLabel = "Blandat agerande";
    assessmentColor = "var(--color-muted)";
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sammanfattning
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Card>
        <div className="h-1.5" style={{ backgroundColor: assessmentColor }} />
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center gap-3">
            {assessmentIcon}
            <span className="text-xl font-semibold">{assessmentLabel}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Party's votes */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Hur röstade {partyName}?
              </h4>
              <div className="space-y-1">
                {supportedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ThumbsUp className="size-4 text-success" />
                    <span>Stödde <strong>{supportedCount}</strong> förslag</span>
                  </div>
                )}
                {opposedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ThumbsDown className="size-4 text-destructive" />
                    <span>Röstade emot <strong>{opposedCount}</strong> förslag</span>
                  </div>
                )}
                {supportedCount === 0 && opposedCount === 0 && (
                  <p className="text-sm text-muted-foreground">Inga relevanta röstningar</p>
                )}
              </div>
            </div>

            {/* Riksdag outcome */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Vad beslutade riksdagen?
              </h4>
              <div className="space-y-1">
                {adoptedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-success" />
                    <span><strong>{adoptedCount}</strong> förslag antagna</span>
                  </div>
                )}
                {totalRelevant - adoptedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="size-4 text-muted-foreground" />
                    <span><strong>{totalRelevant - adoptedCount}</strong> förslag avslagna</span>
                  </div>
                )}
                {totalRelevant === 0 && (
                  <p className="text-sm text-muted-foreground">Inga förslag behandlade</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
