"use client";

import { SiteHeader } from "@/components/layout";
import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useAccountabilityFilters,
} from "@/hooks/useAccountability";
import { PartyScorecard } from "./PartyScorecard";
import { PromiseFeed } from "./PromiseFeed";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedParty = searchParams.get("party") || "all";
  const selectedCategory = searchParams.get("category") || "all";

  const { data: filters } = useAccountabilityFilters();
  const categories = filters?.categories ?? [];

  const buildUrl = useCallback((party: string, category: string) => {
    const params = new URLSearchParams();
    if (party !== "all") params.set("party", party);
    if (category !== "all") params.set("category", category);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }, []);

  const handlePartyChange = useCallback(
    (party: string) => {
      router.push(buildUrl(party, selectedCategory), { scroll: false });
    },
    [router, buildUrl, selectedCategory],
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      router.push(buildUrl(selectedParty, category), { scroll: false });
    },
    [router, buildUrl, selectedParty],
  );

  return (
    <>
      <PartyScorecard
        selectedParty={selectedParty}
        selectedCategory={selectedCategory}
        onPartySelect={handlePartyChange}
        onCategoryChange={handleCategoryChange}
        categories={categories}
      />

      <PromiseFeed
        selectedParty={selectedParty}
        selectedCategory={selectedCategory}
      />
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
