"use client";

import { SiteHeader } from "@/components/layout";
import { Suspense } from "react";
import { AccountabilityFeed } from "./AccountabilityFeed";

export default function HomePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <Suspense fallback={null}>
          <AccountabilityFeed
            title="Håller politikerna vad de lovar?"
            subtitle="Se hur partiernas vallöften stämmer med deras röstningar i riksdagen."
            showAllLink
          />
        </Suspense>

        <footer className="border-t py-6 mt-auto">
          <div className="page-container text-center text-muted-foreground">
            <p className="text-sm">
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
      </main>
    </div>
  );
}
