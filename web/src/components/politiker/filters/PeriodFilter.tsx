"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "lucide-react";

interface Period {
  value: string;
  label: string;
  fromDate: string;
  toDate: string;
}

function getRiksdagsperioder(): Period[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentPeriodStart = currentMonth < 7 ? currentYear - 1 : currentYear;

  const periods: Period[] = [
    { value: "all", label: "Alla år", fromDate: "", toDate: "" },
  ];

  for (let year = currentPeriodStart; year >= 2014; year--) {
    const periodLabel = `${year}/${(year + 1).toString().slice(-2)}`;
    periods.push({
      value: periodLabel,
      label: periodLabel,
      fromDate: `${year}-08-01`,
      toDate: `${year + 1}-07-31`,
    });
  }

  return periods;
}

const riksdagsperioder = getRiksdagsperioder();

export interface DateRange {
  fromDate?: string;
  toDate?: string;
}

interface PeriodFilterProps {
  periodFilter: string;
  onPeriodChange: (period: string) => void;
  customFromDate: string;
  customToDate: string;
  onCustomFromDateChange: (date: string) => void;
  onCustomToDateChange: (date: string) => void;
  useCustomDates: boolean;
  onUseCustomDatesChange: (use: boolean) => void;
}

export function PeriodFilter({
  periodFilter,
  onPeriodChange,
  customFromDate,
  customToDate,
  onCustomFromDateChange,
  onCustomToDateChange,
  useCustomDates,
  onUseCustomDatesChange,
}: PeriodFilterProps) {
  const [showAllPeriods, setShowAllPeriods] = useState(false);

  const timeFilterLabel = useMemo(() => {
    if (useCustomDates && (customFromDate || customToDate)) {
      if (customFromDate && customToDate) {
        return `${customFromDate} – ${customToDate}`;
      }
      if (customFromDate) return `Från ${customFromDate}`;
      if (customToDate) return `Till ${customToDate}`;
    }
    return (
      riksdagsperioder.find((p) => p.value === periodFilter)?.label ?? "Alla år"
    );
  }, [periodFilter, customFromDate, customToDate, useCustomDates]);

  const handlePeriodSelect = (period: string) => {
    onUseCustomDatesChange(false);
    onPeriodChange(period);
  };

  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
        <Calendar className="size-3.5" />
        <span>{timeFilterLabel}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Riksdagsperiod</p>
          <div className="flex flex-wrap gap-1.5">
            {(showAllPeriods
              ? riksdagsperioder
              : riksdagsperioder.slice(0, 6)
            ).map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodSelect(period.value)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  !useCustomDates && periodFilter === period.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {period.label}
              </button>
            ))}
            {!showAllPeriods && riksdagsperioder.length > 6 && (
              <button
                onClick={() => setShowAllPeriods(true)}
                className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
              >
                Visa mer...
              </button>
            )}
          </div>

          <Separator />

          <button
            onClick={() => onUseCustomDatesChange(true)}
            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors ${
              useCustomDates
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Anpassat datumintervall...
          </button>

          {useCustomDates && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-xs text-muted-foreground">Från</label>
                <Input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => onCustomFromDateChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Till</label>
                <Input
                  type="date"
                  value={customToDate}
                  onChange={(e) => onCustomToDateChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getDateRangeFromPeriod(
  periodFilter: string,
  customFromDate: string,
  customToDate: string,
  useCustomDates: boolean
): DateRange {
  if (useCustomDates && (customFromDate || customToDate)) {
    return {
      fromDate: customFromDate || undefined,
      toDate: customToDate || undefined,
    };
  }

  const period = riksdagsperioder.find((p) => p.value === periodFilter);
  if (period && period.value !== "all") {
    return {
      fromDate: period.fromDate,
      toDate: period.toDate,
    };
  }

  return { fromDate: undefined, toDate: undefined };
}
