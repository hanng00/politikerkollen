import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchPoliticiansPage,
  type PoliticianSummary,
  type SortOption,
} from "@/hooks/useFetchPoliticians";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

async function fetchHighlights(
  sortBy: SortOption,
  limit: number,
  fromDate?: string,
): Promise<PoliticianSummary[]> {
  try {
    const result = await fetchPoliticiansPage({
      sortBy,
      limit,
      fromDate,
    });
    return result.data;
  } catch {
    return [];
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}k`;
  }
  return n.toLocaleString("sv-SE");
}

function formatNumberFull(n: number): string {
  return n.toLocaleString("sv-SE");
}

export async function Highlights() {
  const threeMonthsAgo = getDateNDaysAgo(90);

  const [mostRebel, mostActive] = await Promise.all([
    fetchHighlights("mostRebel", 5, threeMonthsAgo),
    fetchHighlights("mostActive", 5, threeMonthsAgo),
  ]);

  if (mostRebel.length === 0 && mostActive.length === 0) return null;

  return (
    <section className="border-t py-12 md:py-16">
      <div className="page-container space-y-12">
        {/* Aggregate stats */}
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-center">
          <StatBlock label="Ledamöter" value="349" />
          <StatBlock label="Röstningar" value="2,1M+" />
          <StatBlock label="Anföranden" value="380k+" />
          <StatBlock label="Data från" value="1990–nu" />
        </div>

        {/* Highlight lists */}
        <div className="grid gap-8 md:grid-cols-2">
          <HighlightList
            title="Flest rebellröster (90 dagar)"
            description="Ledamöter som oftast röstar mot sitt eget parti"
            politicians={mostRebel}
            statFn={(p) =>
              `${formatNumberFull(p.stats.rebelVoteCount)} rebellröster`
            }
          />
          <HighlightList
            title="Mest aktiva (90 dagar)"
            description="Flest röstningar, anföranden och dokument"
            politicians={mostActive}
            statFn={(p) =>
              `${formatNumber(p.stats.totalVotes + p.stats.totalSpeeches + p.stats.totalAuthored)} handlingar`
            }
          />
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

function HighlightList({
  title,
  description,
  politicians,
  statFn,
}: {
  title: string;
  description: string;
  politicians: PoliticianSummary[];
  statFn: (p: PoliticianSummary) => string;
}) {
  if (politicians.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-1">
        {politicians.map((p, i) => (
          <Link
            key={p.id}
            href={`/politiker/${p.id}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group"
          >
            <span className="text-sm text-muted-foreground w-5 text-right tabular-nums">
              {i + 1}
            </span>
            <Avatar className="size-8">
              {p.imageUrl && <AvatarImage src={p.imageUrl} alt={p.name} />}
              <AvatarFallback className="text-xs">
                {p.firstName[0]}
                {p.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({p.party})
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground tabular-nums shrink-0">
              {statFn(p)}
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
