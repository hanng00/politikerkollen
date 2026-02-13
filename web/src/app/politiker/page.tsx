"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, AlertTriangle, Users, ArrowUpDown, Flame, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SiteHeader } from "@/components/layout";
import { useFetchPoliticians, useFetchTrendingContradictions } from "@/hooks";
import { PoliticianCard, ContradictionCard } from "@/components/politiker";
import { parties, getPoliticianById } from "@/mocks";

type SortOption = "name" | "rank" | "contradictions" | "trending";

const sortOptions = [
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "contradictions", label: "Mest motsägelser", icon: AlertTriangle },
  { value: "rank", label: "Ranking", icon: Users },
  { value: "name", label: "Namn A-Ö", icon: null },
] as const;

export default function PoliticiansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);

  const { data: politicians, isLoading } = useFetchPoliticians({
    partyId: partyFilter ?? undefined,
    sortBy,
  });
  const { data: trendingContradictions } = useFetchTrendingContradictions();

  const filteredPoliticians = politicians?.filter((p) => {
    if (!searchQuery) return true;
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentSort = sortOptions.find((s) => s.value === sortBy)!;

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />

      <main className="page-container py-8 space-y-8">
        {/* Hero */}
        <header className="page-section text-center">
          <h1 className="page-title">Riksdagens ledamöter</h1>
          <p className="page-subtitle">Sök, filtrera och se vad politikerna faktiskt gör.</p>
        </header>

        {/* Trending */}
        {trendingContradictions?.length ? (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Flame className="size-4 text-warning" />
                  Trending just nu
                </h2>
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    Visa alla <ChevronRight className="size-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="card-grid-2">
                {trendingContradictions.slice(0, 2).map((c) => {
                  const pol = getPoliticianById(c.politicianId);
                  return pol ? (
                    <ContradictionCard key={c.id} contradiction={c} politician={pol} featured />
                  ) : null;
                })}
              </div>
            </section>
            <Separator />
          </>
        ) : null}

        {/* Search & Filters */}
        <section className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Sök politiker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted">
                <ArrowUpDown className="size-3" />
                {currentSort.label}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setSortBy(opt.value)}>
                    {opt.icon && <opt.icon className="size-4 mr-2" />}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="filter-bar">
            <Button
              variant={partyFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => setPartyFilter(null)}
            >
              Alla
            </Button>
            {parties.map((party) => (
              <Button
                key={party.id}
                variant={partyFilter === party.id ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => setPartyFilter(party.id)}
              >
                {party.shortName}
              </Button>
            ))}
          </div>
        </section>

        {/* Politicians Grid */}
        <section>
          {isLoading ? (
            <div className="card-grid-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : filteredPoliticians?.length ? (
            <div className="card-grid-3">
              {filteredPoliticians.map((p) => (
                <PoliticianCard key={p.id} politician={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">Inga politiker hittades</p>
          )}
        </section>

        {/* Stats */}
        <Separator />
        <section className="card-grid-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">349</p>
              <p className="text-sm text-muted-foreground">Riksdagsledamöter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-destructive">{trendingContradictions?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Aktiva motsägelser</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-success">12.8k</p>
              <p className="text-sm text-muted-foreground">Visningar idag</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
