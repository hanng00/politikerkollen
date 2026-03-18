import { SiteHeader, SiteFooter } from "@/components/layout";
import Link from "next/link";
import type { Metadata } from "next";
import { reports } from "./(intelligence)/rapporter/data";
import { MiniScorecard } from "./MiniScorecard";

export const metadata: Metadata = {
  title: "Politikerkollen",
  description: "Demokratisk infrastruktur för spårbarhet och ansvarsutkrävande i svensk politik.",
};

function LatestReport() {
  const featured = reports.find(r => r.iteration && r.iteration >= 2) || reports[0];
  const timeline = featured.sections.find(s => s.type === "timeline");
  const events = (timeline?.data as { date: string; event: string }[] | undefined)?.slice(0, 4) || [];
  
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{featured.date}</p>
          <p className="font-medium truncate">{featured.title}</p>
        </div>
      </div>
      
      {events.length > 0 && (
        <div className="relative pl-3 border-l border-border space-y-3">
          {events.map((event, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[13px] top-1.5 size-[5px] rounded-full bg-foreground/40" />
              <p className="text-xs text-muted-foreground">{event.date}</p>
              <p className="text-sm">{event.event}</p>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground line-clamp-2">
        {featured.keyInsight}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* Hero - minimal */}
        <section className="page-container pt-16 pb-8 md:pt-24 md:pb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif max-w-2xl leading-[1.15]">
            Politiskt agerande under permanent offentlig insyn
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg">
            Demokratisk infrastruktur för spårbarhet och ansvarsutkrävande.
          </p>
        </section>

        {/* Two Products - show don't tell */}
        <section className="page-container flex-1 pb-12 md:pb-20">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 md:auto-rows-fr">
            
            {/* Löften - live scorecard */}
            <Link 
              href="/loften" 
              className="group relative flex flex-col rounded-lg border bg-card hover:border-foreground/20 transition-colors overflow-hidden"
            >
              <div className="p-5 md:p-6 pb-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h2 className="text-lg md:text-xl font-serif">Löften vs. agerande</h2>
                  <span className="text-xs border rounded-full px-2.5 py-0.5 shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                    Utforska
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Håller partierna sina vallöften?
                </p>
              </div>
              
              <div className="flex-1 px-5 md:px-6 pb-5 md:pb-6">
                <MiniScorecard />
              </div>
            </Link>

            {/* Intelligence - live report */}
            <Link 
              href="/rapporter" 
              className="group relative flex flex-col rounded-lg border bg-card hover:border-foreground/20 transition-colors overflow-hidden"
            >
              <div className="p-5 md:p-6 pb-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h2 className="text-lg md:text-xl font-serif">Politisk Intelligence</h2>
                  <span className="text-xs border rounded-full px-2.5 py-0.5 shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                    Utforska
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Djupanalyser av lagstiftningsprocesser
                </p>
              </div>
              
              <div className="flex-1 px-5 md:px-6 pb-5 md:pb-6">
                <LatestReport />
              </div>
            </Link>

          </div>
        </section>

        {/* Stats - inline */}
        <section className="border-t">
          <div className="page-container py-5">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span><strong className="text-foreground">349</strong> ledamöter</span>
              <span><strong className="text-foreground">2.1M+</strong> röstningar</span>
              <span><strong className="text-foreground">380k+</strong> anföranden</span>
              <span>Från <strong className="text-foreground">1990</strong></span>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
