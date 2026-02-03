"use client";

import { motion } from "motion/react";
import {
  BarChart3Icon,
  PieChartIcon,
  Loader2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import { scaleIn, defaultTransition } from "@/lib/animations";
import { PieChart, type PieChartProps } from "@/components/charts/PieChart";
import { BarChart, type BarChartProps } from "@/components/charts/BarChart";

interface ChartRendererProps {
  chartType: "pie_chart" | "bar_chart";
  input: unknown;
  output: unknown;
  state: string;
}

interface ChartError {
  error: boolean;
  message: string;
  hint?: string;
  example?: string;
  received?: string;
}

function isChartError(output: unknown): output is ChartError {
  return (
    typeof output === "object" &&
    output !== null &&
    "error" in output &&
    (output as ChartError).error === true
  );
}

export function ChartRenderer({
  chartType,
  input,
  output,
  state,
}: ChartRendererProps) {
  const isLoading = state !== "output-available" && state !== "result";
  const hasError = isChartError(output);
  const chartData = !hasError
    ? (output as ({ type: string } & (PieChartProps | BarChartProps)) | null)
    : null;

  const getIcon = () => {
    switch (chartType) {
      case "pie_chart":
        return <PieChartIcon className="size-4 text-primary" />;
      case "bar_chart":
        return <BarChart3Icon className="size-4 text-primary" />;
      default:
        return <BarChart3Icon className="size-4 text-primary" />;
    }
  };

  const getLabel = () => {
    switch (chartType) {
      case "pie_chart":
        return "Cirkeldiagram";
      case "bar_chart":
        return "Stapeldiagram";
      default:
        return "Diagram";
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={defaultTransition}
    >
      <div className="border border-border/50 rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
          {isLoading ? (
            <Loader2Icon className="size-4 text-primary animate-spin" />
          ) : (
            getIcon()
          )}
          <span className="text-sm font-medium text-foreground/80">
            {isLoading ? "Skapar diagram..." : getLabel()}
          </span>
        </div>

        {/* Chart content */}
        <div className="p-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Laddar diagram...
              </div>
            </div>
          ) : hasError ? (
            // Validation error display
            <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {(output as ChartError).message}
                  </p>
                  {(output as ChartError).hint && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Tips:</span>{" "}
                      {(output as ChartError).hint}
                    </p>
                  )}
                  {(output as ChartError).example && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                      {(output as ChartError).example}
                    </p>
                  )}
                  {(output as ChartError).received && (
                    <details className="text-xs">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                        Visa mottagen data
                      </summary>
                      <pre className="mt-2 p-2 bg-muted/50 rounded overflow-x-auto text-[10px] font-mono text-muted-foreground">
                        {(output as ChartError).received}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ) : chartData ? (
            <>
              {chartType === "pie_chart" && (
                <PieChart
                  title={chartData.title}
                  description={(chartData as PieChartProps).description}
                  data={(chartData as PieChartProps).data}
                />
              )}
              {chartType === "bar_chart" && (
                <BarChart
                  title={chartData.title}
                  description={(chartData as BarChartProps).description}
                  data={(chartData as BarChartProps).data}
                  series={(chartData as BarChartProps).series}
                  stacked={(chartData as BarChartProps).stacked}
                  horizontal={(chartData as BarChartProps).horizontal}
                />
              )}
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Kunde inte ladda diagram
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
