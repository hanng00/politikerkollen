"use client";

import { Suspense } from "react";

import { SiteHeader } from "@/components/layout";
import { AccountabilityFeed } from "@/app/AccountabilityFeed";

export default function LoftenPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Suspense fallback={null}>
          <AccountabilityFeed
            title="Löften vs Verklighet"
            subtitle="Sa. Gjorde. Bevis."
          />
        </Suspense>
      </main>

      <footer className="border-t py-6">
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
    </div>
  );
}
