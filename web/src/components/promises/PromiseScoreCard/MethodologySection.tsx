"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function MethodologySection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            Om analysen
          </span>
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-muted/30 mt-2">
            <CardContent className="pt-4 pb-4 text-sm text-muted-foreground space-y-3">
              <p>
                Denna analys baseras på AI-matchning av vallöftet mot riksdagens dokument 
                (motioner och propositioner). Varje förslag har granskats för relevans och 
                partiets röstning har hämtats från riksdagens öppna data.
              </p>
              <p>
                AI-analysen kan innehålla fel. Verifiera alltid mot originalkällorna via länkarna.
              </p>
              <a 
                href="/om/metodik" 
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                Läs mer om vår metodik
                <ExternalLink className="size-3" />
              </a>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
