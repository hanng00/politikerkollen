"use client";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Report, ReportSection, TrendDataPoint, ReportQuote } from "../data";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Zap,
  Building2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

interface TocItem {
  id: string;
  title: string;
  type: string;
  level: 1 | 2 | 3;
}

function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length === 0) return null;

  // Filter out executive-summary (Huvudbudskap) from ToC
  const filteredItems = items.filter(item => item.type !== "executive-summary");

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      // Update URL without scrolling
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <nav className="hidden xl:block fixed top-32 right-8 w-56 max-h-[calc(100vh-10rem)] overflow-y-auto">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
        Innehåll
      </div>
      <ul className="space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = activeId === item.id;
          // Indentation based on level
          const paddingClass = item.level === 1 
            ? "pl-0" 
            : item.level === 2 
              ? "pl-3" 
              : "pl-6";
          // Font weight based on level
          const fontClass = item.level === 1 
            ? "font-medium" 
            : item.level === 2 
              ? "font-normal" 
              : "font-normal text-[12px]";
          
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`block py-1.5 border-l-2 transition-colors ${paddingClass} ${fontClass} ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

const verticalConfig = {
  energi: {
    label: "Energi",
    icon: Zap,
  },
  fastighet: {
    label: "Fastighet",
    icon: Building2,
  },
  general: {
    label: "Allmänt",
    icon: TrendingUp,
  },
};

const partyColors: Record<string, string> = {
  M: "hsl(var(--chart-1))",
  S: "hsl(var(--chart-2))",
  SD: "hsl(var(--chart-3))",
  C: "hsl(var(--chart-4))",
  V: "hsl(var(--chart-5))",
  KD: "hsl(var(--chart-1))",
  L: "hsl(var(--chart-2))",
  MP: "hsl(var(--chart-3))",
};

function CalloutSection({ section }: { section: ReportSection }) {
  return (
    <section className="mt-16 mb-8">
      {section.title && (
        <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
      )}
      <p className="text-base leading-relaxed text-muted-foreground">{section.content}</p>
    </section>
  );
}

interface PyramidEvidence {
  type: string;
  data: unknown;
}

interface PyramidSectionData {
  actionTitle: string;
  supportingFacts: string[];
  evidence?: PyramidEvidence[];
  takeaway: string;
}

function PyramidSection({ section }: { section: ReportSection }) {
  const data = section as unknown as { 
    actionTitle: string;
    supportingFacts: string[];
    evidence?: PyramidEvidence[];
    takeaway: string;
  };

  return (
    <section className="my-12 py-8 border-t">
      {/* Action Title - The conclusion */}
      <h2 className="text-xl md:text-2xl font-semibold mb-6 leading-tight">
        {data.actionTitle}
      </h2>

      {/* Supporting Facts */}
      <ul className="space-y-2 mb-8">
        {data.supportingFacts.map((fact, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-primary font-semibold shrink-0">•</span>
            <span className="text-muted-foreground">{fact}</span>
          </li>
        ))}
      </ul>

      {/* Evidence */}
      {data.evidence && data.evidence.length > 0 && (
        <div className="mb-8 space-y-6">
          {data.evidence.map((ev, i) => (
            <PyramidEvidence key={i} evidence={ev} />
          ))}
        </div>
      )}

      {/* Takeaway */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          <span className="font-semibold text-primary">→ Takeaway:</span>{" "}
          <span className="text-foreground">{data.takeaway}</span>
        </p>
      </div>
    </section>
  );
}

function PyramidEvidence({ evidence }: { evidence: PyramidEvidence }) {
  if (evidence.type === "metrics") {
    const metrics = evidence.data as Array<{ label: string; value: string; subtext?: string }>;
    return (
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card text-center">
            <p className="text-2xl font-semibold mb-1">{m.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
            {m.subtext && (
              <p className="text-xs text-muted-foreground mt-1">{m.subtext}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (evidence.type === "vote-comparison") {
    const votes = evidence.data as Array<{
      punkt: string;
      rubrik: string;
      ja: number;
      nej: number;
      avstar: number;
      jaPartier: string;
      nejPartier: string;
      avstarPartier?: string;
    }>;
    return (
      <div className="space-y-4">
        {votes.map((vote, i) => {
          const total = vote.ja + vote.nej + vote.avstar;
          const jaPercent = (vote.ja / total) * 100;
          const nejPercent = (vote.nej / total) * 100;
          
          return (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs text-muted-foreground font-mono">Punkt {vote.punkt}</span>
                  <h4 className="font-medium text-sm">{vote.rubrik}</h4>
                </div>
              </div>
              
              <div className="h-2 rounded-full overflow-hidden flex bg-muted mb-3">
                <div className="bg-success" style={{ width: `${jaPercent}%` }} />
                <div className="bg-destructive" style={{ width: `${nejPercent}%` }} />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-success font-medium">{vote.ja} Ja</span>
                  <p className="text-muted-foreground mt-0.5">{vote.jaPartier}</p>
                </div>
                <div>
                  <span className="text-destructive font-medium">{vote.nej} Nej</span>
                  <p className="text-muted-foreground mt-0.5">{vote.nejPartier}</p>
                </div>
                {vote.avstar > 0 && (
                  <div>
                    <span className="text-muted-foreground font-medium">{vote.avstar} Avstår</span>
                    <p className="text-muted-foreground mt-0.5">{vote.avstarPartier}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (evidence.type === "prediction-table") {
    const predictions = evidence.data as Array<{
      betankande: string;
      titel: string;
      karaktar: string;
      prediktion: string;
      konfidens: string;
    }>;
    return (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Betänkande</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Karaktär</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prediktion</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konfidens</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="py-3 px-4">
                  <span className="font-mono text-xs">{p.betankande}</span>
                  <p className="text-muted-foreground text-xs">{p.titel}</p>
                </td>
                <td className="py-3 px-4 text-sm">{p.karaktar}</td>
                <td className="py-3 px-4 text-sm font-medium">{p.prediktion}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.konfidens === "Hög" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {p.konfidens}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (evidence.type === "implications") {
    const implications = evidence.data as Array<{
      target: string;
      situation: string;
      action: string;
      deadline: string;
    }>;
    return (
      <div className="grid gap-4">
        {implications.map((impl, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <h4 className="font-medium text-sm mb-2">{impl.target}</h4>
            <p className="text-sm text-muted-foreground mb-2">{impl.situation}</p>
            <p className="text-sm mb-2">
              <span className="text-primary">→</span> {impl.action}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Bevaka:</span> {impl.deadline}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (evidence.type === "stakeholders") {
    const stakeholders = evidence.data as Array<{
      name: string;
      position: "for" | "critical" | "against";
      positionLabel: string;
      argument: string;
      source: string;
      url: string;
    }>;

    const positionStyles = {
      for: "bg-success/10 text-success border-success/20",
      critical: "bg-warning/10 text-warning border-warning/20",
      against: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const getInitials = (name: string) =>
      name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {stakeholders.map((s, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3 mb-2">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">{getInitials(s.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{s.name}</h4>
                <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded border ${positionStyles[s.position]}`}>
                  {s.positionLabel}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{s.argument}</p>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
              {s.source} →
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (evidence.type === "quotes") {
    const quotes = evidence.data as Array<{
      politician: string;
      party: string;
      context: string;
      date: string;
      imageUrl?: string;
    }>;

    return (
      <div className="space-y-3">
        {quotes.map((q, i) => (
          <blockquote key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              {q.imageUrl && (
                <img src={q.imageUrl} alt={q.politician} className="size-10 rounded-full object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm italic text-muted-foreground mb-2">"{q.context}"</p>
                <p className="text-xs">
                  <span className="font-medium">{q.politician}</span>
                  <span className="text-muted-foreground"> ({q.party}), {q.date}</span>
                </p>
              </div>
            </div>
          </blockquote>
        ))}
      </div>
    );
  }

  return null;
}

function NarrativeSection({ section }: { section: ReportSection }) {
  return (
    <div className="my-6">
      {section.title && (
        <h3 className="text-sm font-semibold mb-2">{section.title}</h3>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {section.content}
      </p>
    </div>
  );
}

function ChartSection({ section }: { section: ReportSection }) {
  const data = section.data as TrendDataPoint[];
  if (!data || data.length === 0) return null;

  const parties = Object.keys(data[0]).filter((k) => k !== "month" && k !== "parti");
  
  // Use distinct colors that work in both light and dark mode
  const chartColors = [
    "#8b5cf6", // violet
    "#3b82f6", // blue
    "#22c55e", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
    "#14b8a6", // teal
    "#94a3b8", // slate
  ];
  
  const chartConfig: ChartConfig = parties.reduce((acc, party, i) => {
    acc[party] = {
      label: party,
      color: chartColors[i % chartColors.length],
    };
    return acc;
  }, {} as ChartConfig);

  const isBarChart = section.chartType === "bar" || data.length <= 2;

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      <div className="rounded-lg border p-4 bg-card">
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          {isBarChart ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={data[0].parti ? "parti" : "month"}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              {parties.map((party, i) => (
                <Bar
                  key={party}
                  dataKey={party}
                  fill={chartColors[i % chartColors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const [year, month] = value.split("-");
                  return `${month}/${year.slice(2)}`;
                }}
              />
              <YAxis tickLine={false} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              {parties.map((party, i) => (
                <Area
                  key={party}
                  type="monotone"
                  dataKey={party}
                  stroke={chartColors[i % chartColors.length]}
                  fill={chartColors[i % chartColors.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          )}
        </ChartContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {parties.map((party, i) => (
          <div key={party} className="flex items-center gap-1.5 text-xs">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: chartColors[i % chartColors.length] }}
            />
            <span className="text-muted-foreground">{party}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function QuotesSection({ section }: { section: ReportSection }) {
  const quotes = section.data as ReportQuote[];
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      <div className="space-y-6">
        {quotes.map((quote, i) => (
          <blockquote key={i} className="pl-4 border-l-2 border-border">
            <p className="text-base italic leading-relaxed mb-3">"{quote.context}"</p>
            <footer className="flex items-center gap-2 text-sm text-muted-foreground">
              {quote.imageUrl && (
                <div className="relative size-6 rounded-full overflow-hidden bg-muted shrink-0">
                  <Image
                    src={quote.imageUrl}
                    alt={quote.politician}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <span className="font-medium text-foreground">{quote.politician}</span>
              <span>·</span>
              <span>{quote.party}</span>
              <span>·</span>
              <span>{new Date(quote.date).toLocaleDateString("sv-SE")}</span>
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}

function TableSection({ section }: { section: ReportSection }) {
  const data = section.data as Record<string, unknown>[];
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  const renderCellValue = (col: string, value: unknown) => {
    const strValue = String(value);
    
    // If column is URL or the value looks like a URL, render as link
    if (col.toLowerCase() === "url" || col.toLowerCase() === "länk") {
      const url = strValue.startsWith("http") ? strValue : `https://${strValue}`;
      return (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm"
        >
          Källa →
        </a>
      );
    }
    
    if (col === "zScore") {
      return (
        <span className="font-mono text-xs">
          {typeof value === "number" ? value.toFixed(1) : strValue}
        </span>
      );
    }
    
    return <span className="text-sm">{strValue}</span>;
  };

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {col === "zScore" ? "Z-Score" : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                {columns.map((col) => (
                  <td key={col} className="py-3 px-4">
                    {renderCellValue(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

interface TimelineEvent {
  date: string;
  event: string;
  description: string;
  actor: string;
  source?: string;
}

function TimelineSection({ section }: { section: ReportSection }) {
  const events = section.data as unknown as TimelineEvent[];
  if (!events || events.length === 0) return null;

  const formatDate = (dateStr: string) => {
    if (dateStr.includes("Q")) return dateStr;
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      <div className="space-y-0">
        {events.map((event, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="size-2.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-border mt-2" />
              )}
            </div>
            <div className="pb-8">
              <time className="text-xs text-muted-foreground font-mono block mb-1">
                {formatDate(event.date)}
              </time>
              <p className="font-medium text-sm mb-0.5">{event.description}</p>
              <p className="text-xs text-muted-foreground">{event.actor}</p>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

interface VoteResult {
  punkt: string;
  rubrik: string;
  ja: number;
  nej: number;
  avstar: number;
  jaPartier: string;
  nejPartier: string;
  avstarPartier?: string;
}

function VoteResultSection({ section }: { section: ReportSection }) {
  const votes = section.data as unknown as VoteResult[];
  if (!votes || votes.length === 0) return null;

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      <div className="space-y-4">
        {votes.map((vote, i) => {
          const total = vote.ja + vote.nej + vote.avstar;
          const jaPercent = (vote.ja / total) * 100;
          const nejPercent = (vote.nej / total) * 100;
          
          return (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs text-muted-foreground font-mono">Punkt {vote.punkt}</span>
                  <h4 className="font-medium text-sm">{vote.rubrik}</h4>
                </div>
                <Badge variant={jaPercent > 50 ? "secondary" : "outline"} className="shrink-0 text-xs">
                  {jaPercent > 50 ? "Antaget" : "Avslaget"}
                </Badge>
              </div>
              
              <div className="h-2 rounded-full overflow-hidden flex bg-muted mb-3">
                <div 
                  className="bg-success" 
                  style={{ width: `${jaPercent}%` }}
                />
                <div 
                  className="bg-destructive" 
                  style={{ width: `${nejPercent}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-success font-medium">{vote.ja} Ja</span>
                  <p className="text-muted-foreground mt-0.5">{vote.jaPartier}</p>
                </div>
                <div>
                  <span className="text-destructive font-medium">{vote.nej} Nej</span>
                  <p className="text-muted-foreground mt-0.5">{vote.nejPartier}</p>
                </div>
                {vote.avstar > 0 && (
                  <div>
                    <span className="text-muted-foreground font-medium">{vote.avstar} Avstår</span>
                    <p className="text-muted-foreground mt-0.5">{vote.avstarPartier}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function PoliticiansSection({ section }: { section: ReportSection }) {
  const politicians = section.politicians;
  if (!politicians || politicians.length === 0) return null;

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      {section.content && (
        <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {politicians.map((p, i) => (
          <div key={i}>
            <div className="aspect-square relative bg-muted rounded-lg overflow-hidden mb-2">
              <Image
                src={p.imageUrl}
                alt={p.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="font-medium text-sm">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.party}</p>
            {p.role && (
              <p className="text-xs text-muted-foreground">{p.role}</p>
            )}
          </div>
        ))}
      </div>
    </figure>
  );
}

interface Stakeholder {
  name: string;
  position: "for" | "critical" | "against";
  positionLabel: string;
  argument: string;
  source: string;
  url: string;
  logoUrl?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StakeholdersSection({ section }: { section: ReportSection }) {
  const stakeholders = section.data as unknown as Stakeholder[];
  if (!stakeholders || stakeholders.length === 0) return null;

  const forGroup = stakeholders.filter((s) => s.position === "for");
  const criticalGroup = stakeholders.filter((s) => s.position === "critical");
  const againstGroup = stakeholders.filter((s) => s.position === "against");

  const positionStyles = {
    for: "bg-success/10 text-success border-success/20",
    critical: "bg-warning/10 text-warning border-warning/20",
    against: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const groupLabels = {
    for: "För förslaget",
    critical: "Kritiska",
    against: "Emot förslaget",
  };

  const renderStakeholderCard = (stakeholder: Stakeholder) => (
    <div key={stakeholder.name} className="p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3 mb-3">
        {stakeholder.logoUrl ? (
          <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={stakeholder.logoUrl}
              alt={stakeholder.name}
              className="size-full object-contain"
            />
          </div>
        ) : (
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {getInitials(stakeholder.name)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{stakeholder.name}</h4>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded border ${positionStyles[stakeholder.position]}`}
          >
            {stakeholder.positionLabel}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
        {stakeholder.argument}
      </p>
      <a
        href={stakeholder.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        {stakeholder.source} →
      </a>
    </div>
  );

  const renderGroup = (
    group: Stakeholder[],
    position: "for" | "critical" | "against"
  ) => {
    if (group.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {groupLabels[position]}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {group.map(renderStakeholderCard)}
        </div>
      </div>
    );
  };

  return (
    <figure className="my-8">
      {section.title && (
        <figcaption className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </figcaption>
      )}
      {renderGroup(forGroup, "for")}
      {renderGroup(criticalGroup, "critical")}
      {renderGroup(againstGroup, "against")}
    </figure>
  );
}

interface DataGapItem {
  source: string;
  description: string;
  status: string;
}

function DataGapSection({ section }: { section: ReportSection }) {
  const gaps = section.data as unknown as DataGapItem[];
  if (!gaps || gaps.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      {section.content && (
        <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
      )}
      <div className="p-4 rounded-lg border border-dashed bg-muted/30">
        <div className="space-y-3">
          {gaps.map((gap, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5">
                {gap.status === "Saknas" ? (
                  <XCircle className="size-4 text-destructive" />
                ) : gap.status === "Delvis" ? (
                  <Clock className="size-4 text-warning" />
                ) : (
                  <CheckCircle2 className="size-4 text-success" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{gap.source}</p>
                <p className="text-xs text-muted-foreground">{gap.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DividerSection({ section }: { section: ReportSection }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
        {section.title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SourceListSection({ section }: { section: ReportSection }) {
  const items = section.data as Record<string, unknown>[];
  if (!items || items.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      {section.content && (
        <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
      )}
      <div className="p-4 rounded-lg bg-muted/30">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              {Object.entries(item).map(([key, value], j) => (
                <span key={key}>
                  {j > 0 && <span> · </span>}
                  <span className={j === 0 ? "font-medium text-foreground" : ""}>
                    {String(value)}
                  </span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ExecutiveSummarySection({ section }: { section: ReportSection }) {
  const metrics = section.data as Record<string, unknown>[];

  return (
    <section className="mb-16">
      {section.title && (
        <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>
      )}
      {section.content && (
        <p className="text-lg leading-relaxed mb-8">{section.content}</p>
      )}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          {metrics.map((m, i) => (
            <div key={i}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{String(m.label)}</p>
              <p className="text-sm font-medium">{String(m.value)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface ExecutiveSummaryV2Data {
  label: string;
  value: string;
  subtext?: string;
}

interface ExecutiveSummaryV2Implication {
  target: string;
  action: string;
}

function ExecutiveSummaryV2Section({ section }: { section: ReportSection }) {
  const metrics = section.data as unknown as ExecutiveSummaryV2Data[];
  const implications = (section as unknown as { implications?: ExecutiveSummaryV2Implication[] }).implications;

  return (
    <section className="mb-12">
      {/* Main content */}
      {section.content && (
        <p className="text-lg leading-relaxed mb-8">{section.content}</p>
      )}

      {/* Key metrics */}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {metrics.map((m, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card text-center">
              <p className="text-2xl font-semibold mb-1">{m.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
              {m.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{m.subtext}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* What this means for you */}
      {implications && implications.length > 0 && (
        <div className="p-6 rounded-lg bg-primary/5 border border-primary/20">
          <h3 className="font-semibold mb-4">Vad betyder detta för er?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {implications.map((impl, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-semibold shrink-0">→</span>
                <div>
                  <span className="font-medium text-sm">{impl.target}:</span>{" "}
                  <span className="text-sm text-muted-foreground">{impl.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface ImplicationItem {
  target: string;
  implication: string;
  action: string;
}

function ImplicationsSection({ section }: { section: ReportSection }) {
  const items = section.data as unknown as ImplicationItem[];
  if (!items || items.length === 0) return null;

  return (
    <section className="my-12">
      {section.title && (
        <h2 className="text-xl font-semibold mb-6">{section.title}</h2>
      )}
      
      {/* Early CTA for engaged readers */}
      <div className="mb-6 p-4 rounded-lg border border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Vill du ha skräddarsydda insikter för just er?</strong>{" "}
          Vi kan anpassa dessa analyser för er specifika situation.{" "}
          <a 
            href="mailto:hannes@politikerkollen.se?subject=Intresserad av skräddarsydda rapporter"
            className="text-primary hover:underline"
          >
            Kontakta oss →
          </a>
        </p>
      </div>

      <div className="grid gap-4">
        {items.map((item, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <h3 className="font-medium text-sm mb-1">{item.target}</h3>
            <p className="text-sm text-muted-foreground mb-3">{item.implication}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">→</span> {item.action}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface MethodologyStep {
  steg: string;
  beskrivning: string;
}

function MethodologySection({ section }: { section: ReportSection }) {
  const steps = section.data as unknown as MethodologyStep[];

  return (
    <div className="my-8 p-6 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title || "Metodik"}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {section.content && (
        <p className="text-sm text-muted-foreground mb-6">{section.content}</p>
      )}
      {steps && steps.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="p-3 rounded-md bg-background border">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-medium text-muted-foreground">{step.steg}</span>
              </div>
              <p className="text-sm text-muted-foreground">{step.beskrivning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSectionRenderer({ section, id }: { section: ReportSection; id: string }) {
  const content = (() => {
    switch (section.type) {
      case "callout":
        return <CalloutSection section={section} />;
      case "pyramid-section":
        return <PyramidSection section={section} />;
      case "narrative":
        return <NarrativeSection section={section} />;
      case "chart":
        return <ChartSection section={section} />;
      case "quotes":
        return <QuotesSection section={section} />;
      case "table":
        return <TableSection section={section} />;
      case "stakeholders":
        return <StakeholdersSection section={section} />;
      case "timeline":
        return <TimelineSection section={section} />;
      case "vote-result":
        return <VoteResultSection section={section} />;
      case "politicians":
        return <PoliticiansSection section={section} />;
      case "data-gap":
        return <DataGapSection section={section} />;
      case "divider":
        return <DividerSection section={section} />;
      case "source-list":
        return <SourceListSection section={section} />;
      case "executive-summary":
        return <ExecutiveSummarySection section={section} />;
      case "executive-summary-v2":
        return <ExecutiveSummaryV2Section section={section} />;
      case "implications":
        return <ImplicationsSection section={section} />;
      case "methodology":
        return <MethodologySection section={section} />;
      default:
        return null;
    }
  })();

  return <div id={id}>{content}</div>;
}

function generateSectionId(section: ReportSection, index: number): string {
  const title = section.title || section.type;
  return `section-${index}-${title.toLowerCase().replace(/[^a-z0-9åäö]+/g, "-").slice(0, 30)}`;
}

function getSectionLevel(type: string): 1 | 2 | 3 {
  // Level 1: The main thesis / executive summary
  if (type === "executive-summary") return 1;
  // Level 2: Main arguments (callouts that introduce sections)
  if (type === "callout") return 2;
  if (type === "implications") return 2;
  // Level 3: Supporting evidence
  return 3;
}

function getTocItems(sections: ReportSection[]): TocItem[] {
  const items: TocItem[] = [];
  
  sections.forEach((section, index) => {
    if (!section.title) return;
    if (section.type === "narrative" && !section.title) return;
    if (section.type === "divider") return;

    const level = getSectionLevel(section.type);

    items.push({
      id: generateSectionId(section, index),
      title: section.title,
      type: section.type,
      level,
    });
  });
  
  return items;
}

export default function ReportClient({ report }: { report: Report }) {
  const vertical = verticalConfig[report.vertical];
  const Icon = vertical.icon;

  const tocItems = useMemo(() => getTocItems(report.sections), [report.sections]);
  const sectionIds = useMemo(
    () => report.sections.map((section, index) => generateSectionId(section, index)),
    [report.sections]
  );
  const activeId = useActiveSection(sectionIds);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <TableOfContents items={tocItems} activeId={activeId} />
        
        <article className="page-container-narrow py-8 md:py-12 xl:mr-64">
          <Link
            href="/rapporter"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="size-4 mr-1" />
            Alla rapporter
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              {report.iteration && (
                <Badge variant="secondary">
                  Iteration {report.iteration}
                </Badge>
              )}
              <Icon className="size-4" />
              <span>{vertical.label}</span>
              <span>·</span>
              <time>
                {new Date(report.date).toLocaleDateString("sv-SE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>

            <h1 className="text-3xl md:text-4xl mb-3">{report.title}</h1>
            <p className="text-xl text-muted-foreground">{report.subtitle}</p>

            {(report.predictionMade || report.predictionOutcome) && (
              <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                  <span className="font-medium">Pågående prediktion</span>
                </div>
                {report.predictionMade && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Prediktion:</strong> {report.predictionMade}
                  </p>
                )}
                {report.predictionOutcome && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Utfall:</strong> {report.predictionOutcome}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-6">
              {report.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </header>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {report.sections.map((section, i) => (
              <ReportSectionRenderer 
                key={i} 
                section={section} 
                id={generateSectionId(section, i)}
              />
            ))}
          </div>

          {/* Next Report Section */}
          <section className="mt-8 p-6 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Nästa rapport</span>
            </div>
            <h3 className="font-semibold mb-2">
              {report.vertical === "energi" 
                ? "HD01NU17 Elmarknadsfrågor — Uppföljning" 
                : "Strandskydd Steg 2 — Utredningsanalys"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {report.vertical === "energi"
                ? "Vi bevakar omröstningen och uppdaterar denna rapport när beslut fattas. Förväntat: Q2 2026."
                : "Vi analyserar Steg 2-utredningen när den publiceras. Förväntat: H2 2026."}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Vill du bli notifierad?</span>
              <a 
                href="mailto:hannes@politikerkollen.se?subject=Notifiera mig om nästa rapport"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Anmäl intresse <ChevronRight className="size-3" />
              </a>
            </div>
          </section>

          {/* CTA Section */}
          <footer className="mt-12 pt-8 border-t space-y-6">
            <div className="p-6 rounded-lg bg-muted/30 border">
              <h2 className="text-lg font-semibold mb-3">
                Vill du ha dessa insikter anpassade för er?
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Vi bygger skräddarsydda rapporter för Public Affairs-team som vill ligga steget före. 
                Få branschspecifika analyser, alerts vid viktiga beslut, och prediktioner ni kan agera på.
              </p>
              
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
                  <span>Veckovisa rapporter för er bransch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
                  <span>Alerts vid viktiga omröstningar</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
                  <span>Intressentanalys & prediktioner</span>
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="tel:+46763281170"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Phone className="size-4" />
                  Boka ett samtal
                </a>
                <a
                  href="mailto:hannes@politikerkollen.se?subject=Intresserad av Intelligence-tjänsten"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Mail className="size-4" />
                  Skicka förfrågan
                </a>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Priser från 5 000 kr/månad. Skräddarsydda lösningar för större organisationer.
              </p>
            </div>

            {/* Personalization hint */}
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Är du från {report.vertical === "energi" ? "ett energibolag" : "fastighetsbranschen"}?</strong>{" "}
                {report.vertical === "energi" 
                  ? "Vi har specialiserade rapporter för kärnkraftsbolag, vindkraftsbolag, elnätsbolag och storförbrukare. Kontakta oss för en skräddarsydd lösning."
                  : "Vi har specialiserade rapporter för fastighetsägare, byggherrar och kommuner. Kontakta oss för en skräddarsydd lösning."}
              </p>
            </div>
          </footer>
        </article>

        <SiteFooter />
      </main>
    </div>
  );
}
