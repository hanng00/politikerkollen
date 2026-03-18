"use client";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Report, ReportSection, TrendDataPoint, ReportQuote, Politician } from "../data";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Zap,
  Building2,
  TrendingUp,
  AlertTriangle,
  Quote,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileWarning,
  CircleDot,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

const verticalConfig = {
  energi: {
    label: "Energi",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  fastighet: {
    label: "Fastighet",
    icon: Building2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  general: {
    label: "Allmänt",
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

const partyColors: Record<string, string> = {
  M: "hsl(210, 70%, 50%)",
  S: "hsl(0, 70%, 50%)",
  SD: "hsl(45, 80%, 50%)",
  C: "hsl(120, 50%, 45%)",
  V: "hsl(0, 60%, 40%)",
  KD: "hsl(270, 50%, 50%)",
  L: "hsl(200, 70%, 55%)",
  MP: "hsl(140, 60%, 45%)",
};

function CalloutSection({ section }: { section: ReportSection }) {
  const highlight = section.highlight;
  
  let bgClass = "from-primary/10 via-primary/5 to-transparent border-primary/20";
  let badgeClass = "bg-primary text-primary-foreground";
  let Icon = AlertTriangle;

  if (highlight === "prediction-correct") {
    bgClass = "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20";
    badgeClass = "bg-emerald-600 text-white";
    Icon = CheckCircle2;
  } else if (highlight === "warning") {
    bgClass = "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20";
    badgeClass = "bg-amber-600 text-white";
    Icon = AlertTriangle;
  } else if (highlight === "opportunity") {
    bgClass = "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20";
    badgeClass = "bg-blue-600 text-white";
    Icon = TrendingUp;
  } else if (highlight === "drop") {
    bgClass = "from-red-500/10 via-red-500/5 to-transparent border-red-500/20";
    badgeClass = "bg-red-600 text-white";
    Icon = AlertTriangle;
  }

  return (
    <div className={`relative my-8 p-6 rounded-xl bg-gradient-to-br ${bgClass} border`}>
      <div className="absolute -top-3 left-6">
        <Badge className={badgeClass}>
          <Icon className="size-3 mr-1" />
          {section.title}
        </Badge>
      </div>
      <p className="text-lg leading-relaxed mt-2">{section.content}</p>
    </div>
  );
}

function NarrativeSection({ section }: { section: ReportSection }) {
  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-xl mb-4">{section.title}</h3>
      )}
      <p className="text-muted-foreground leading-relaxed text-lg">
        {section.content}
      </p>
    </div>
  );
}

function ChartSection({ section }: { section: ReportSection }) {
  const data = section.data as TrendDataPoint[];
  if (!data || data.length === 0) return null;

  const parties = Object.keys(data[0]).filter((k) => k !== "month" && k !== "parti");
  
  const chartConfig: ChartConfig = parties.reduce((acc, party) => {
    acc[party] = {
      label: party,
      color: partyColors[party] || "hsl(var(--chart-1))",
    };
    return acc;
  }, {} as ChartConfig);

  const isBarChart = section.chartType === "bar" || data.length <= 2;

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
      )}
      <Card>
        <CardContent className="pt-6">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            {isBarChart ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey={data[0].parti ? "parti" : "month"}
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {parties.map((party, i) => (
                  <Bar
                    key={party}
                    dataKey={party}
                    fill={partyColors[party] || `hsl(var(--chart-${(i % 5) + 1}))`}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-");
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {parties.map((party, i) => (
                  <Area
                    key={party}
                    type="monotone"
                    dataKey={party}
                    stroke={partyColors[party] || `hsl(var(--chart-${(i % 5) + 1}))`}
                    fill={partyColors[party] || `hsl(var(--chart-${(i % 5) + 1}))`}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            )}
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {parties.map((party) => (
          <div key={party} className="flex items-center gap-1.5 text-xs">
            <div
              className="size-3 rounded-sm"
              style={{ backgroundColor: partyColors[party] || "hsl(var(--chart-1))" }}
            />
            <span className="text-muted-foreground">{party}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuotesSection({ section }: { section: ReportSection }) {
  const quotes = section.data as ReportQuote[];
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
      )}
      <div className="space-y-4">
        {quotes.map((quote, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: partyColors[quote.party] || "hsl(var(--primary))" }}
            />
            <CardContent className="pt-4 pl-6">
              <div className="flex items-center gap-3 mb-2">
                {quote.imageUrl && (
                  <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0">
                    <Image
                      src={quote.imageUrl}
                      alt={quote.politician}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{quote.politician}</span>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: partyColors[quote.party],
                        color: partyColors[quote.party],
                      }}
                    >
                      {quote.party}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(quote.date).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground italic">"{quote.context}"</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TableSection({ section }: { section: ReportSection }) {
  const data = section.data as Record<string, unknown>[];
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
      )}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left py-2 px-3 font-medium text-muted-foreground capitalize"
                  >
                    {col === "zScore" ? "Z-Score" : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-3">
                      {col === "parti" ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: partyColors[row[col] as string],
                            color: partyColors[row[col] as string],
                          }}
                        >
                          {row[col] as string}
                        </Badge>
                      ) : col === "zScore" ? (
                        <span className="font-mono">
                          {typeof row[col] === "number"
                            ? (row[col] as number).toFixed(1)
                            : row[col] as string}
                        </span>
                      ) : (
                        (row[col] as string | number)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
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

  const eventColors: Record<string, string> = {
    PROPOSITION: "bg-blue-500",
    FÖLJDMOTION: "bg-amber-500",
    BETÄNKANDE: "bg-purple-500",
    DEBATT: "bg-emerald-500",
    BESLUT: "bg-green-600",
    "POLITISKT BESLUT": "bg-indigo-500",
    LAGRÅDSREMISS: "bg-cyan-500",
    MOTIONER: "bg-amber-500",
    UTSKOTT: "bg-purple-500",
    OPINION: "bg-rose-500",
    UTREDNING: "bg-violet-500",
    IKRAFTTRÄDANDE: "bg-green-700",
  };

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
      )}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={i} className="relative pl-10">
              <div className={`absolute left-2.5 top-1.5 size-3 rounded-full ${eventColors[event.event] || "bg-muted-foreground"}`} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <time className="text-xs text-muted-foreground font-mono">
                  {new Date(event.date).toLocaleDateString("sv-SE")}
                </time>
                <Badge variant="outline" className="w-fit text-xs">
                  {event.event}
                </Badge>
              </div>
              <p className="text-sm mt-1">{event.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{event.actor}</span>
                {event.source && (
                  <>
                    <span>·</span>
                    <span className="italic">{event.source}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
      )}
      <div className="space-y-4">
        {votes.map((vote, i) => {
          const total = vote.ja + vote.nej + vote.avstar;
          const jaPercent = (vote.ja / total) * 100;
          const nejPercent = (vote.nej / total) * 100;
          
          return (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Punkt {vote.punkt}</span>
                    <h4 className="font-medium">{vote.rubrik}</h4>
                  </div>
                  <Badge variant={jaPercent > 50 ? "default" : "destructive"}>
                    {jaPercent > 50 ? "Antaget" : "Avslaget"}
                  </Badge>
                </div>
                
                <div className="h-4 rounded-full overflow-hidden flex bg-muted mb-2">
                  <div 
                    className="bg-emerald-500 transition-all" 
                    style={{ width: `${jaPercent}%` }}
                  />
                  <div 
                    className="bg-red-500 transition-all" 
                    style={{ width: `${nejPercent}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-emerald-500 font-medium">{vote.ja} Ja</span>
                    <p className="text-muted-foreground">{vote.jaPartier}</p>
                  </div>
                  <div>
                    <span className="text-red-500 font-medium">{vote.nej} Nej</span>
                    <p className="text-muted-foreground">{vote.nejPartier}</p>
                  </div>
                  {vote.avstar > 0 && (
                    <div>
                      <span className="text-muted-foreground font-medium">{vote.avstar} Avstår</span>
                      <p className="text-muted-foreground">{vote.avstarPartier}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PoliticiansSection({ section }: { section: ReportSection }) {
  const politicians = section.politicians;
  if (!politicians || politicians.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-2">{section.title}</h3>
      )}
      {section.content && (
        <p className="text-muted-foreground mb-4">{section.content}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {politicians.map((p, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square relative bg-muted">
              <Image
                src={p.imageUrl}
                alt={p.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: partyColors[p.party],
                    color: partyColors[p.party],
                  }}
                >
                  {p.party}
                </Badge>
              </div>
              {p.role && (
                <p className="text-xs text-muted-foreground mt-1">{p.role}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
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

  const hasFoundItems = gaps.some(g => g.status === "Hittad");
  const borderClass = hasFoundItems 
    ? "border-emerald-500/50 bg-emerald-500/5" 
    : "border-amber-500/50 bg-amber-500/5";

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-2">{section.title}</h3>
      )}
      {section.content && (
        <p className="text-muted-foreground mb-4">{section.content}</p>
      )}
      <Card className={`border-dashed ${borderClass}`}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {gap.status === "Saknas" ? (
                    <XCircle className="size-4 text-red-500" />
                  ) : gap.status === "Delvis" ? (
                    <Clock className="size-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{gap.source}</p>
                    {gap.status === "Hittad" && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Nu känd
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{gap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DividerSection({ section }: { section: ReportSection }) {
  const isPart2 = section.part === 2;
  
  return (
    <div className="my-12 relative">
      <div className="absolute inset-0 flex items-center">
        <div className={`w-full border-t-2 ${isPart2 ? "border-emerald-500/30" : "border-border"}`} />
      </div>
      <div className="relative flex justify-center">
        <div className={`px-4 py-2 rounded-full ${isPart2 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-muted border"}`}>
          <span className={`text-sm font-semibold ${isPart2 ? "text-emerald-600" : "text-muted-foreground"}`}>
            {section.title}
          </span>
        </div>
      </div>
      {section.content && (
        <p className="text-center text-sm text-muted-foreground mt-3">{section.content}</p>
      )}
    </div>
  );
}

function SourceListSection({ section }: { section: ReportSection }) {
  const items = section.data as Record<string, unknown>[];
  if (!items || items.length === 0) return null;

  return (
    <div className="my-8">
      {section.title && (
        <h3 className="text-lg font-medium mb-2">{section.title}</h3>
      )}
      {section.content && (
        <p className="text-muted-foreground mb-4">{section.content}</p>
      )}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                <CircleDot className="size-3 mt-1.5 text-primary shrink-0" />
                <div className="flex-1 text-sm">
                  {Object.entries(item).map(([key, value], j) => (
                    <span key={key}>
                      {j > 0 && <span className="text-muted-foreground"> · </span>}
                      <span className={j === 0 ? "font-medium" : "text-muted-foreground"}>
                        {String(value)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExecutiveSummarySection({ section }: { section: ReportSection }) {
  const metrics = section.data as Record<string, unknown>[];

  return (
    <div className="my-8 p-6 rounded-xl bg-primary/5 border border-primary/20">
      {section.title && (
        <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
      )}
      {section.content && (
        <p className="text-muted-foreground mb-4">{section.content}</p>
      )}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {metrics.map((m, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{String(m.label)}</p>
              <p className="text-lg font-semibold mt-1">{String(m.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <div className="my-8">
      {section.title && (
        <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
      )}
      <div className="space-y-4">
        {items.map((item, i) => (
          <Card key={i} className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2">{item.target}</h3>
              <p className="text-muted-foreground text-sm mb-3">{item.implication}</p>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                <span className="text-xs font-medium text-primary uppercase tracking-wide shrink-0">Rekommendation:</span>
                <span className="text-sm">{item.action}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface MethodologyStep {
  steg: string;
  beskrivning: string;
}

function MethodologySection({ section }: { section: ReportSection }) {
  const steps = section.data as unknown as MethodologyStep[];

  return (
    <div className="my-12 pt-8 border-t">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FileWarning className="size-4" />
            <span className="text-sm font-medium">{section.title || "Hur denna rapport togs fram"}</span>
            <span className="text-xs ml-auto group-open:rotate-180 transition-transform">▼</span>
          </div>
        </summary>
        <div className="mt-4 pl-6 border-l-2 border-muted">
          {section.content && (
            <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
          )}
          {steps && steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-muted-foreground">{step.steg}</span>
                  <span className="text-muted-foreground">{step.beskrivning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function ReportSectionRenderer({ section }: { section: ReportSection }) {
  switch (section.type) {
    case "callout":
      return <CalloutSection section={section} />;
    case "narrative":
      return <NarrativeSection section={section} />;
    case "chart":
      return <ChartSection section={section} />;
    case "quotes":
      return <QuotesSection section={section} />;
    case "table":
      return <TableSection section={section} />;
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
    case "implications":
      return <ImplicationsSection section={section} />;
    case "methodology":
      return <MethodologySection section={section} />;
    default:
      return null;
  }
}

export default function ReportClient({ report }: { report: Report }) {
  const vertical = verticalConfig[report.vertical];
  const Icon = vertical.icon;

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <article className="page-container-narrow py-8 md:py-12">
          <Link
            href="/rapporter"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="size-4 mr-1" />
            Alla rapporter
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {report.iteration && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Iteration {report.iteration}
                </Badge>
              )}
              <div className={`p-1.5 rounded-md ${vertical.bgColor}`}>
                <Icon className={`size-4 ${vertical.color}`} />
              </div>
              <span className="text-sm text-muted-foreground">
                {vertical.label}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <time className="text-sm text-muted-foreground">
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
              <div className="mt-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="font-medium text-emerald-500">Validerad prediktion</span>
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
              <ReportSectionRenderer key={i} section={section} />
            ))}
          </div>

          <footer className="mt-12 pt-8 border-t">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  Vill du ha dessa insikter regelbundet?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Vi bygger en tjänst för Public Affairs-proffs som vill ligga
                  steget före. Få anpassade rapporter för din bransch varje vecka.
                </p>
                <a
                  href="tel:+46763281170"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Kontakta oss
                </a>
              </CardContent>
            </Card>
          </footer>
        </article>

        <SiteFooter />
      </main>
    </div>
  );
}
