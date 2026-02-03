"use client";

import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { formatDateLabel } from "@/lib/utils/format_date_label";

export interface BarChartDataItem {
  label: string;
  [key: string]: string | number;
}

export interface BarChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface BarChartProps {
  title: string;
  description?: string;
  data: BarChartDataItem[];
  series: BarChartSeries[];
  stacked?: boolean;
  horizontal?: boolean;
}

const DEFAULT_COLORS = [
  "#22c55e", "#ef4444", "#f59e0b", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#94a3b8",
];

export function BarChart({ 
  title, 
  description, 
  data, 
  series,
  stacked = false,
  horizontal = false,
}: BarChartProps) {
  const chartConfig: ChartConfig = series.reduce((acc, item, index) => {
    acc[item.key] = {
      label: item.label,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="w-full">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <ChartContainer config={chartConfig} className="aspect-video max-h-[300px]">
        <RechartsBarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatDateLabel(String(value ?? "")) || String(value ?? "-")}
          />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </RechartsBarChart>
      </ChartContainer>
    </div>
  );
}
