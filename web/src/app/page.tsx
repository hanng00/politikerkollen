"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpDown, Clock, Eye, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { SiteHeader } from "@/components/layout";
import { ContradictionCard } from "@/components/politiker";
import { useFetchAllContradictions, useFetchTopics } from "@/hooks";
import { getPoliticianById } from "@/mocks";

type SortOption = "trending" | "recent" | "views";

const sortOptions = [
  { value: "trending", label: "Trending", icon: Flame },
  { value: "recent", label: "Senaste", icon: Clock },
  { value: "views", label: "Mest visade", icon: Eye },
] as const;

export default function HomePage() {
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const { data: contradictions, isLoading } = useFetchAllContradictions({
    topicId: topicFilter ?? undefined,
    sortBy,
  });
  const { data: topics } = useFetchTopics();

  const featuredContradiction = contradictions?.find((c) => c.isTrending);
  const otherContradictions = contradictions?.filter(
    (c) => c !== featuredContradiction,
  );
  const currentSort = sortOptions.find((s) => s.value === sortBy)!;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-container py-6 space-y-6">
        {/* Featured */}
        {featuredContradiction && !isLoading && (
          <>
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
                <Flame className="size-4 text-warning" />
                Trending just nu
              </h2>
              <div className="max-w-2xl">
                {(() => {
                  const pol = getPoliticianById(
                    featuredContradiction.politicianId,
                  );
                  return pol ? (
                    <ContradictionCard
                      contradiction={featuredContradiction}
                      politician={pol}
                      featured
                    />
                  ) : null;
                })()}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Filters */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-destructive" />
              Alla motsägelser
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium hover:bg-muted">
                <ArrowUpDown className="size-3" />
                {currentSort.label}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                  >
                    <opt.icon className="size-4 mr-2" />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="filter-bar">
            <Button
              variant={topicFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => setTopicFilter(null)}
            >
              Alla
            </Button>
            {topics?.map((topic) => (
              <Button
                key={topic.id}
                variant={topicFilter === topic.id ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => setTopicFilter(topic.id)}
              >
                {topic.name}
              </Button>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section>
          {isLoading ? (
            <div className="card-grid-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : otherContradictions?.length ? (
            <div className="card-grid-2">
              {otherContradictions.map((c) => {
                const pol = getPoliticianById(c.politicianId);
                return pol ? (
                  <ContradictionCard
                    key={c.id}
                    contradiction={c}
                    politician={pol}
                  />
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Inga motsägelser hittades
            </p>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-8 border-t">
          Ett verktyg för demokratiskt ansvarsutkrävande.
        </footer>
      </main>
    </div>
  );
}
