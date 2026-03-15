import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";

export function PromiseSection({ score }: { score: PromiseScore }) {
  const partyColor = getPartyColor(score.promise_party);
  const partyName = getPartyName(score.promise_party);
  const categoryName = CATEGORY_NAMES[score.category] ?? score.category;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Löftet
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <blockquote className="text-xl font-serif leading-relaxed">
            &ldquo;{score.promise_text}&rdquo;
          </blockquote>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              style={{ borderColor: partyColor, color: partyColor }}
            >
              {partyName}
            </Badge>
            <Badge variant="secondary">{categoryName}</Badge>
            <span className="text-sm text-muted-foreground">
              Valmanifest {score.promise_year}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
