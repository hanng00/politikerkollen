"use client";

import { motion } from "motion/react";
import { UserIcon, Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { scaleIn, defaultTransition } from "@/lib/animations";
import { PoliticianCard, type PoliticianCardProps } from "@/components/charts/PoliticianCard";

interface PoliticianCardRendererProps {
  input: unknown;
  output: unknown;
  state: string;
}

interface CardError {
  error: boolean;
  message: string;
  hint?: string;
}

function isCardError(output: unknown): output is CardError {
  return typeof output === 'object' && output !== null && 'error' in output && (output as CardError).error === true;
}

export function PoliticianCardRenderer({ input, output, state }: PoliticianCardRendererProps) {
  const isLoading = state !== "output-available" && state !== "result";
  const hasError = isCardError(output);
  const cardData = !hasError && output && typeof output === "object" && "type" in output && output.type === "politician_card"
    ? output as { type: string } & PoliticianCardProps
    : null;

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
            <UserIcon className="size-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground/80">
            {isLoading ? "Laddar profil..." : "Politikerprofil"}
          </span>
        </div>

        {/* Card content */}
        <div className="p-4">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Laddar profil...</div>
            </div>
          ) : hasError ? (
            <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {(output as CardError).message}
                  </p>
                  {(output as CardError).hint && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Tips:</span> {(output as CardError).hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : cardData ? (
            <PoliticianCard {...cardData} />
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Kunde inte ladda profil</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
