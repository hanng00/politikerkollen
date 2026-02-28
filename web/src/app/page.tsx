import { SiteHeader } from "@/components/layout";
import { Suspense } from "react";
import { Hero } from "./Hero";
import { Highlights } from "./Highlights";

export default function HomePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <Hero />

        <Suspense fallback={null}>
          <Highlights />
        </Suspense>

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
      </main>
    </div>
  );
}
