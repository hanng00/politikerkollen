"use client";

import { motion } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePartyEvidenceScorecard } from "@/hooks/useAccountability";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import {
  CATEGORY_NAMES,
  getPartyColor,
  getPartyName,
  PARTY_ABBREVS,
} from "@/lib/parties";
import type { PartyEvidenceScore } from "@/types";

function ScorecardBar({
  score,
  index,
  isSelected,
  onSelect,
}: {
  score: PartyEvidenceScore;
  index: number;
  isSelected: boolean;
  onSelect: (party: string) => void;
}) {
  const partyColor = getPartyColor(score.party);
  const partyName = getPartyName(score.party);
  const total = Number(score.total_promises);

  const keptCount =
    Number(score.acted_count) + Number(score.some_action_count);
  const mixedCount = Number(score.mixed_count);
  const brokeCount =
    Number(score.some_inaction_count) + Number(score.contradiction_count);

  const keptPct = total > 0 ? Math.round((keptCount / total) * 100) : 0;
  const mixedPct = total > 0 ? Math.round((mixedCount / total) * 100) : 0;
  const brokePct = total > 0 ? Math.round((brokeCount / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="group"
    >
      <button
        onClick={() => onSelect(score.party)}
        className={`block w-full text-left transition-all rounded-sm ${isSelected ? "bg-muted/50 ring-1 ring-primary/30" : "hover:bg-muted/30"}`}
      >
        <div className="grid grid-cols-[3.5rem_1fr_3.5rem] sm:grid-cols-[5rem_1fr_5rem] items-center gap-2 sm:gap-3 py-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: partyColor }}
            />
            <span className="text-sm font-medium truncate">
              {score.party.toUpperCase()}
            </span>
          </div>

          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger
                render={<div />}
                className="relative h-7 flex items-center cursor-pointer"
              >
                <div className="absolute inset-0 flex rounded-sm overflow-hidden bg-muted/30">
                  <motion.div
                    className="h-full"
                    style={{
                      backgroundColor: "var(--color-destructive)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${brokePct}%` }}
                    transition={{
                      delay: 0.3 + index * 0.06,
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                  <motion.div
                    className="h-full bg-muted"
                    initial={{ width: 0 }}
                    animate={{ width: `${mixedPct}%` }}
                    transition={{
                      delay: 0.35 + index * 0.06,
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                  <motion.div
                    className="h-full"
                    style={{
                      backgroundColor: "var(--color-success)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${keptPct}%` }}
                    transition={{
                      delay: 0.4 + index * 0.06,
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs space-y-0.5">
                <p className="font-medium">{partyName}</p>
                <p>{total} löften analyserade</p>
                <p className="text-success">
                  {keptCount} hållna ({keptPct}%)
                </p>
                <p className="text-muted-foreground">
                  {mixedCount} oklara ({mixedPct}%)
                </p>
                <p className="text-destructive">
                  {brokeCount} brutna ({brokePct}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="text-right">
            <span className="text-xs tabular-nums text-muted-foreground">
              {total}
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export function PartyScorecard({
  selectedParty,
  selectedCategory,
  onPartySelect,
  onCategoryChange,
  categories,
}: {
  selectedParty: string;
  selectedCategory: string;
  onPartySelect: (party: string) => void;
  onCategoryChange: (category: string) => void;
  categories: string[];
}) {
  const categoryParam =
    selectedCategory !== "all" ? selectedCategory : undefined;
  const {
    data: scores,
    isLoading,
    error,
  } = usePartyEvidenceScorecard(categoryParam);

  if (error) return null;

  const categoryLabel =
    selectedCategory !== "all"
      ? (CATEGORY_NAMES[selectedCategory] ?? selectedCategory)
      : null;

  return (
    <section className="py-10 md:py-14">
      <div className="page-container">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeIn} className="text-center space-y-3">
            <h2>Håller partierna sina löften?</h2>
            <p className="page-subtitle">
              {categoryLabel
                ? `Vallöften inom ${categoryLabel.toLowerCase()} jämförda med faktiska röstningar.`
                : "Vallöften jämförda med faktiska röstningar i riksdagen mandatperioden 2022-2026."}
            </p>
          </motion.div>

          {/* Party filter */}
          <motion.div variants={fadeIn} className="flex justify-center">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
              <ToggleGroup
                value={selectedParty === "all" ? [] : [selectedParty]}
                onValueChange={(value: string[]) => {
                  const next = value[value.length - 1];
                  onPartySelect(next ?? "all");
                }}
                spacing={1}
              >
                <ToggleGroupItem
                  value="__all"
                  size="sm"
                  className="text-xs"
                  pressed={selectedParty === "all"}
                  onPressedChange={() => onPartySelect("all")}
                >
                  Alla partier
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
          </motion.div>

          {/* Category filter */}
          <motion.div variants={fadeIn} className="flex justify-center">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
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
                  Alla områden
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
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="py-4 sm:py-6">
                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-7 flex-1" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                ) : scores && scores.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-[3.5rem_1fr_3.5rem] sm:grid-cols-[5rem_1fr_5rem] gap-2 sm:gap-3 mb-2 px-1">
                      <span className="text-xs text-muted-foreground">
                        Parti
                      </span>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="text-destructive">Brutna</span>
                        <span>Oklara</span>
                        <span className="text-success">Hållna</span>
                      </div>
                      <span className="text-xs text-muted-foreground text-right">
                        Löften
                      </span>
                    </div>

                    <div className="divide-y divide-border/50">
                      {scores.map((score, index) => (
                        <ScorecardBar
                          key={score.party}
                          score={score}
                          index={index}
                          isSelected={selectedParty === score.party}
                          onSelect={onPartySelect}
                        />
                      ))}
                    </div>

                    {selectedParty !== "all" && (
                      <div className="mt-4 pt-4 border-t text-center">
                        <button
                          onClick={() => onPartySelect("all")}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Visa alla partier
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Inga löften hittades inom detta område.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeIn} className="text-center">
            <p className="text-xs text-muted-foreground">
              Baserat på AI-analys av vallöften mot riksdagens voteringsprotokoll.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
