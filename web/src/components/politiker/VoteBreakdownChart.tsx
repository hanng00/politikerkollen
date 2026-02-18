"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InfoButton } from "@/components/ui/info-button";
import type { VoteBreakdown } from "@/hooks/useFetchPolitician";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

const chartConfig = {
  ja: {
    label: "Ja",
    color: "hsl(142, 76%, 36%)",
  },
  nej: {
    label: "Nej",
    color: "hsl(0, 84%, 60%)",
  },
  avstar: {
    label: "Avstår",
    color: "hsl(48, 96%, 53%)",
  },
  franvarande: {
    label: "Frånvarande",
    color: "hsl(220, 9%, 46%)",
  },
} satisfies ChartConfig;

interface VoteBreakdownChartProps {
  voteBreakdown: VoteBreakdown;
  totalVotes: number;
}

export function VoteBreakdownChart({
  voteBreakdown,
  totalVotes,
}: VoteBreakdownChartProps) {
  const chartData = useMemo(() => {
    const data = [
      { name: "ja", value: voteBreakdown.ja, fill: chartConfig.ja.color },
      { name: "nej", value: voteBreakdown.nej, fill: chartConfig.nej.color },
      {
        name: "avstar",
        value: voteBreakdown.avstar,
        fill: chartConfig.avstar.color,
      },
      {
        name: "franvarande",
        value: voteBreakdown.franvarande,
        fill: chartConfig.franvarande.color,
      },
    ].filter((d) => d.value > 0);
    return data;
  }, [voteBreakdown]);

  const percentages = useMemo(() => {
    const total =
      voteBreakdown.ja +
      voteBreakdown.nej +
      voteBreakdown.avstar +
      voteBreakdown.franvarande;
    if (total === 0) return { ja: 0, nej: 0, avstar: 0, franvarande: 0 };
    return {
      ja: Math.round((voteBreakdown.ja / total) * 100),
      nej: Math.round((voteBreakdown.nej / total) * 100),
      avstar: Math.round((voteBreakdown.avstar / total) * 100),
      franvarande: Math.round((voteBreakdown.franvarande / total) * 100),
    };
  }, [voteBreakdown]);

  if (totalVotes === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Röstfördelning
          </CardTitle>
          <InfoButton
            title="Röstfördelning"
            description="Visar hur politikern har röstat i alla voteringar i riksdagen. Ja = för förslaget, Nej = mot förslaget, Avstår = varken för eller mot."
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ChartContainer config={chartConfig} className="h-[120px] w-[120px]">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span>
                        {chartConfig[name as keyof typeof chartConfig]?.label}:{" "}
                        {value.toLocaleString()}
                      </span>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: chartConfig.ja.color }}
                />
                <span>Ja</span>
              </div>
              <span className="font-medium tabular-nums">
                {voteBreakdown.ja.toLocaleString()} ({percentages.ja}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: chartConfig.nej.color }}
                />
                <span>Nej</span>
              </div>
              <span className="font-medium tabular-nums">
                {voteBreakdown.nej.toLocaleString()} ({percentages.nej}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: chartConfig.avstar.color }}
                />
                <span>Avstår</span>
              </div>
              <span className="font-medium tabular-nums">
                {voteBreakdown.avstar.toLocaleString()} ({percentages.avstar}%)
              </span>
            </div>
            {voteBreakdown.franvarande > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: chartConfig.franvarande.color }}
                  />
                  <span>Frånvarande</span>
                </div>
                <span className="font-medium tabular-nums">
                  {voteBreakdown.franvarande.toLocaleString()} (
                  {percentages.franvarande}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
