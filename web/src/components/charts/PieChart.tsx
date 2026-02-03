"use client";

import { Pie, PieChart as RechartsPieChart, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

export interface PieChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  title: string;
  description?: string;
  data: PieChartDataItem[];
}

// Default colors for pie slices
const DEFAULT_COLORS = [
  "#22c55e", // green (Ja)
  "#ef4444", // red (Nej)
  "#f59e0b", // amber (Avstår)
  "#94a3b8", // slate (Frånvarande)
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function PieChart({ title, description, data }: PieChartProps) {
  // Build chart config from data
  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    acc[item.label] = {
      label: item.label,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full">
      <div className="mb-2">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <ChartContainer config={chartConfig} className="aspect-square max-h-[300px]">
        <RechartsPieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex items-center justify-between gap-4">
                    <span>{name}</span>
                    <span className="font-mono font-medium">
                      {value} ({((Number(value) / total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={2}
            stroke="hsl(var(--background))"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="label" />} />
        </RechartsPieChart>
      </ChartContainer>
      
      {/* Summary stats */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
            />
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="font-medium">{item.value}</span>
            <span className="text-muted-foreground">
              ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
