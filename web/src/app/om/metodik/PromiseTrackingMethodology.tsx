"use client";

import { useState } from "react";
import { ChevronDown, FileText, Vote, Scale, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function PromiseTrackingMethodology() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="loften" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5" />
            Löftesspårning
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Hur vi bedömer om partier agerar i linje med sina vallöften
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <Collapsible
            open={openSections.overview}
            onOpenChange={() => toggleSection("overview")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-medium hover:text-foreground/80">
              Översikt
              <ChevronDown
                className={`size-4 transition-transform ${
                  openSections.overview ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground space-y-3">
              <p>
                Vi extraherar konkreta löften från partiernas valmanifest och matchar dem 
                mot riksdagens dokument (motioner och propositioner). Sedan analyserar vi 
                hur partiet röstade på dessa dokument för att bedöma om de agerat i linje 
                med sina löften.
              </p>
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="flex items-start gap-2">
                  <FileText className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">1. Matchning</p>
                    <p className="text-xs">AI matchar löften mot riksdagsdokument</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Vote className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">2. Röstanalys</p>
                    <p className="text-xs">Vi hämtar partiets röstning från riksdagen</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Scale className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">3. Bedömning</p>
                    <p className="text-xs">Sammanvägd bedömning av alla underlag</p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Alignment Classification */}
          <Collapsible
            open={openSections.alignment}
            onOpenChange={() => toggleSection("alignment")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-medium hover:text-foreground/80 border-t pt-4">
              Dokumentklassificering
              <ChevronDown
                className={`size-4 transition-transform ${
                  openSections.alignment ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground space-y-3">
              <p>
                Varje matchat dokument klassificeras utifrån hur det förhåller sig till löftet:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2 rounded bg-success/5 border border-success/20">
                  <span className="bg-success/10 text-success px-2 py-0.5 rounded text-xs font-medium">
                    Stödjer löftet
                  </span>
                  <p className="text-xs">
                    Dokumentet föreslår samma sak som löftet. Exempel: löfte om sänkt skatt 
                    matchas mot motion som föreslår skattesänkning.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2 rounded bg-destructive/5 border border-destructive/20">
                  <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-xs font-medium">
                    Motsätter löftet
                  </span>
                  <p className="text-xs">
                    Dokumentet föreslår motsatsen till löftet. Exempel: löfte om sänkt skatt 
                    matchas mot motion som föreslår skattehöjning.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2 rounded bg-muted/50 border">
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-medium">
                    Tangentiellt
                  </span>
                  <p className="text-xs">
                    Dokumentet är relaterat till samma ämne men tar inte ställning i frågan. 
                    Dessa exkluderas från bedömningen.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Vote Interpretation */}
          <Collapsible
            open={openSections.votes}
            onOpenChange={() => toggleSection("votes")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-medium hover:text-foreground/80 border-t pt-4">
              Röstning och löftesuppfyllelse
              <ChevronDown
                className={`size-4 transition-transform ${
                  openSections.votes ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground space-y-3">
              <p>
                <strong>Viktigt:</strong> Att rösta JA eller NEJ säger inte i sig om partiet 
                agerar för eller mot sitt löfte. Det beror på vad dokumentet föreslår:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Dokument</th>
                      <th className="text-left py-2 pr-4">Röstar JA</th>
                      <th className="text-left py-2">Röstar NEJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium">Stödjer löftet</td>
                      <td className="py-2 pr-4 text-success">✓ Agerar för löftet</td>
                      <td className="py-2 text-destructive">✗ Agerar mot löftet</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Motsätter löftet</td>
                      <td className="py-2 pr-4 text-destructive">✗ Agerar mot löftet</td>
                      <td className="py-2 text-success">✓ Agerar för löftet</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs">
                Exempel: Om ett parti lovat sänkt skatt och röstar NEJ på en motion som 
                föreslår höjd skatt, så agerar de <em>för</em> sitt löfte.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Assessment Categories */}
          <Collapsible
            open={openSections.assessment}
            onOpenChange={() => toggleSection("assessment")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-medium hover:text-foreground/80 border-t pt-4">
              Bedömningskategorier
              <ChevronDown
                className={`size-4 transition-transform ${
                  openSections.assessment ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground space-y-3">
              <p>
                Baserat på all tillgänglig evidens ger vi varje löfte en sammanfattande bedömning:
              </p>
              <div className="space-y-2">
                <div className="p-2 rounded border">
                  <p className="font-medium text-foreground">Genomfört</p>
                  <p className="text-xs">
                    En proposition (regeringsförslag) i linje med löftet har antagits av riksdagen.
                  </p>
                </div>
                <div className="p-2 rounded border">
                  <p className="font-medium text-foreground">Delvis genomfört</p>
                  <p className="text-xs">
                    Partiet stödde konsekvent förslag i linje med löftet, och några antogs.
                  </p>
                </div>
                <div className="p-2 rounded border">
                  <p className="font-medium text-foreground">Drev frågan</p>
                  <p className="text-xs">
                    Partiet stödde konsekvent förslag i linje med löftet, men inget antogs.
                  </p>
                </div>
                <div className="p-2 rounded border">
                  <p className="font-medium text-foreground">Visst stöd</p>
                  <p className="text-xs">
                    Partiet visade visst stöd för förslag i linje med löftet, men inte konsekvent.
                  </p>
                </div>
                <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5">
                  <p className="font-medium text-foreground">Motsägelsefullt</p>
                  <p className="text-xs">
                    Partiet både stödde och motarbetade förslag i linje med löftet.
                  </p>
                </div>
                <div className="p-2 rounded border border-destructive/30 bg-destructive/5">
                  <p className="font-medium text-foreground">Röstade emot</p>
                  <p className="text-xs">
                    Partiet agerade huvudsakligen mot förslag i linje med löftet.
                  </p>
                </div>
                <div className="p-2 rounded border">
                  <p className="font-medium text-foreground">Oklart</p>
                  <p className="text-xs">
                    Otillräckligt underlag för att göra en bedömning.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Limitations */}
          <Collapsible
            open={openSections.limitations}
            onOpenChange={() => toggleSection("limitations")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-medium hover:text-foreground/80 border-t pt-4">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Begränsningar
              </span>
              <ChevronDown
                className={`size-4 transition-transform ${
                  openSections.limitations ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground space-y-3">
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  <strong>AI-matchning:</strong> Matchningen mellan löften och dokument görs 
                  med AI och kan innehålla fel. Verifiera alltid mot originalkällorna.
                </li>
                <li>
                  <strong>Saknad röstdata:</strong> Vissa beslut fattas genom acklamation 
                  (utan omröstning) och saknar då röstdata.
                </li>
                <li>
                  <strong>Komplexitet:</strong> Politik är komplext. Ett parti kan ha goda 
                  skäl att rösta mot ett förslag som ytligt sett stödjer deras löfte.
                </li>
                <li>
                  <strong>Tidsperiod:</strong> Vi matchar löften från 2022 mot dokument 
                  från innevarande mandatperiod (2022-2026).
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </section>
  );
}
