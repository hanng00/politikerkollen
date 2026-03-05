"use client";

import { SiteHeader } from "@/components/layout";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AccountabilityFeed } from "./AccountabilityFeed";
import { Hero } from "./Hero";

function TrustStrip() {
  return (
    <section className="border-t py-8">
      <div className="page-container">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-center">
          <StatBlock label="Ledamöter" value="349" />
          <StatBlock label="Röstningar" value="2,1M+" />
          <StatBlock label="Anföranden" value="380k+" />
          <StatBlock label="Valmanifest" value="370" />
          <StatBlock label="Data från" value="1990–nu" />
        </div>
      </div>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-2xl md:text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const hasQuery = searchParams.get("query") !== null;

  return (
    <>
      <Hero />

      {!hasQuery && (
        <>
          <Suspense fallback={null}>
            <AccountabilityFeed />
          </Suspense>

          <TrustStrip />
        </>
      )}

      <footer className="border-t py-6 mt-auto">
        <div className="page-container text-center text-muted-foreground">
          <p className="text-sm">
            Ett verktyg för demokratiskt ansvarsutkrävande.
          </p>
          <p className="text-sm mt-1">
            Data från{" "}
            <a
              href="https://data.riksdagen.se"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Riksdagens öppna data
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </main>
    </div>
  );
}
