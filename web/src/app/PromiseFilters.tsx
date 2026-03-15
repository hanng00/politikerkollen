"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORY_NAMES, getPartyColor, PARTY_ABBREVS } from "@/lib/parties";

export type OutcomeFilter = "all" | "positive" | "negative" | "contradictory";

const OUTCOME_OPTIONS: { value: OutcomeFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Alla", icon: null },
  { value: "positive", label: "Agerade för", icon: <CheckCircle2 className="size-3 text-success" /> },
  { value: "negative", label: "Röstade emot", icon: <XCircle className="size-3 text-destructive" /> },
  { value: "contradictory", label: "Motsägelser", icon: <AlertTriangle className="size-3 text-amber-500" /> },
];

interface PromiseFiltersProps {
  selectedParty: string;
  selectedCategory: string;
  selectedOutcome: OutcomeFilter;
  categories: string[];
  onPartyChange: (party: string) => void;
  onCategoryChange: (category: string) => void;
  onOutcomeChange: (outcome: OutcomeFilter) => void;
}

export function PromiseFilters({
  selectedParty,
  selectedCategory,
  selectedOutcome,
  categories,
  onPartyChange,
  onCategoryChange,
  onOutcomeChange,
}: PromiseFiltersProps) {
  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="page-container py-3 space-y-3">
        {/* Row 1: Party filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block w-12">
            Parti
          </span>
          <div className="flex-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            <ToggleGroup
              value={selectedParty === "all" ? [] : [selectedParty]}
              onValueChange={(value: string[]) => {
                const next = value[value.length - 1];
                onPartyChange(next ?? "all");
              }}
              spacing={1}
            >
              <ToggleGroupItem
                value="__all"
                size="sm"
                className="text-xs"
                pressed={selectedParty === "all"}
                onPressedChange={() => onPartyChange("all")}
              >
                Alla
              </ToggleGroupItem>
              {PARTY_ABBREVS.map((party) => (
                <ToggleGroupItem
                  key={party}
                  value={party}
                  size="sm"
                  className="text-xs"
                >
                  <span
                    className="inline-block size-2 rounded-full mr-1"
                    style={{ backgroundColor: getPartyColor(party) }}
                  />
                  {party.toUpperCase()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Row 2: Category filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block w-12">
            Område
          </span>
          <div className="flex-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            <ToggleGroup
              value={selectedCategory === "all" ? [] : [selectedCategory]}
              onValueChange={(value: string[]) => {
                const next = value[value.length - 1];
                onCategoryChange(next ?? "all");
              }}
              spacing={1}
            >
              <ToggleGroupItem
                value="__all"
                size="sm"
                className="text-xs"
                pressed={selectedCategory === "all"}
                onPressedChange={() => onCategoryChange("all")}
              >
                Alla
              </ToggleGroupItem>
              {categories.map((cat) => (
                <ToggleGroupItem
                  key={cat}
                  value={cat}
                  size="sm"
                  className="text-xs"
                >
                  {CATEGORY_NAMES[cat] ?? cat}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Row 3: Outcome filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block w-12">
            Utfall
          </span>
          <ToggleGroup
            value={selectedOutcome === "all" ? [] : [selectedOutcome]}
            onValueChange={(value: string[]) => {
              const next = value[value.length - 1] as OutcomeFilter | undefined;
              onOutcomeChange(next ?? "all");
            }}
            spacing={1}
          >
            {OUTCOME_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value === "all" ? "__all" : opt.value}
                size="sm"
                className="text-xs"
                pressed={selectedOutcome === opt.value}
                onPressedChange={opt.value === "all" ? () => onOutcomeChange("all") : undefined}
              >
                {opt.icon}
                <span className={opt.icon ? "ml-1" : ""}>{opt.label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
