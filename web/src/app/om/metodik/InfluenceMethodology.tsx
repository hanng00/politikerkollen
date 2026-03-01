"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const GLOBAL_AVG = 0.05;
const PRIOR_STRENGTH = 20;

function bayesianRate(passed: number, total: number): number {
  const alpha = GLOBAL_AVG * PRIOR_STRENGTH;
  const beta = (1 - GLOBAL_AVG) * PRIOR_STRENGTH;
  return (passed + alpha) / (total + alpha + beta);
}

interface Politician {
  id: string;
  label: string;
  passed: number;
  total: number;
  color: string;
}

const POLITICIANS: Politician[] = [
  { id: "a", label: "A", passed: 1, total: 1, color: "var(--chart-1)" },
  { id: "b", label: "B", passed: 5, total: 10, color: "var(--chart-2)" },
  { id: "c", label: "C", passed: 25, total: 50, color: "var(--chart-3)" },
  { id: "d", label: "D", passed: 50, total: 100, color: "var(--chart-4)" },
];

export function InfluenceMethodology() {
  return (
    <Accordion defaultValue={[]}>
      <AccordionItem value="influence">
        <AccordionTrigger className="p-4">
          <div>
            <h3>Politiskt inflytande</h3>
            <p className="text-muted-foreground font-normal">
              Hur vi rankar genomslagskraft rättvist
            </p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4">
          <div className="space-y-6 pb-2">
            {/* WHY */}
            <section className="space-y-2">
              <h4>Varför vi justerar</h4>
              <p className="text-muted-foreground">
                En ledamot med 1 bifallen motion av 1 har 100% bifallsfrekvens.
                En med 50 av 100 har 50%. Men vem har egentligen störst
                inflytande? Rå procent är missvisande när datamängden varierar.
                Vi justerar för osäkerhet — färre datapunkter dras mot snittet.
              </p>
            </section>

            {/* VISUALIZATION */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              {POLITICIANS.map((p) => {
                const rawRate = p.passed / p.total;
                const adjustedRate = bayesianRate(p.passed, p.total);

                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div
                      className="size-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.label}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full opacity-25"
                          style={{
                            width: `${rawRate * 100}%`,
                            backgroundColor: p.color,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${adjustedRate * 100}%`,
                            backgroundColor: p.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-28 shrink-0 tabular-nums">
                      <span className="text-muted-foreground">
                        {Math.round(rawRate * 100)}%
                      </span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-medium">
                        {Math.round(adjustedRate * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
              <p className="text-muted-foreground pt-2 border-t">
                Ljus = rå procent · Mörk = justerad
              </p>
            </div>

            {/* HOW */}
            <section className="space-y-2">
              <h4>Hur det fungerar</h4>
              <p className="text-muted-foreground">
                Vi använder Bayesiansk krympning. Med få observationer är vi
                osäkra, så uppskattningen dras mot riksdagens genomsnitt (~5%).
                Med många observationer låter vi datan tala för sig själv.
              </p>
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-muted-foreground">
                <p>Justerad = (bifallna + α) / (totalt + α + β)</p>
                <p className="mt-1">α = 1, β = 19</p>
              </div>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
