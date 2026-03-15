"use client";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useAccountabilityFilters,
} from "@/hooks/useAccountability";
import { PartyScorecard } from "./PartyScorecard";
import { PromiseFeed } from "./PromiseFeed";
import { PromiseFilters, type OutcomeFilter } from "./PromiseFilters";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedParty = searchParams.get("party") || "all";
  const selectedCategory = searchParams.get("category") || "all";
  const selectedOutcome = (searchParams.get("outcome") || "all") as OutcomeFilter;

  const { data: filters } = useAccountabilityFilters();
  const categories = filters?.categories ?? [];

  const buildUrl = useCallback((party: string, category: string, outcome: OutcomeFilter) => {
    const params = new URLSearchParams();
    if (party !== "all") params.set("party", party);
    if (category !== "all") params.set("category", category);
    if (outcome !== "all") params.set("outcome", outcome);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }, []);

  const handlePartyChange = useCallback(
    (party: string) => {
      router.push(buildUrl(party, selectedCategory, selectedOutcome), { scroll: false });
    },
    [router, buildUrl, selectedCategory, selectedOutcome],
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      router.push(buildUrl(selectedParty, category, selectedOutcome), { scroll: false });
    },
    [router, buildUrl, selectedParty, selectedOutcome],
  );

  const handleOutcomeChange = useCallback(
    (outcome: OutcomeFilter) => {
      router.push(buildUrl(selectedParty, selectedCategory, outcome), { scroll: false });
    },
    [router, buildUrl, selectedParty, selectedCategory],
  );

  return (
    <>
      <PartyScorecard
        selectedParty={selectedParty}
        selectedCategory={selectedCategory}
        onPartySelect={handlePartyChange}
      />

      <PromiseFilters
        selectedParty={selectedParty}
        selectedCategory={selectedCategory}
        selectedOutcome={selectedOutcome}
        categories={categories}
        onPartyChange={handlePartyChange}
        onCategoryChange={handleCategoryChange}
        onOutcomeChange={handleOutcomeChange}
      />

      <PromiseFeed
        selectedParty={selectedParty}
        selectedCategory={selectedCategory}
        selectedOutcome={selectedOutcome}
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

        <SiteFooter />
      </main>
    </div>
  );
}
