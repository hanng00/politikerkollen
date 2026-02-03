"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  DatabaseIcon,
  TableIcon,
  SearchIcon,
  CodeIcon,
  BrainIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  FileTextIcon,
} from "lucide-react";
import { scaleIn, defaultTransition } from "@/lib/animations";
import { RiksdagDocument } from "./RiksdagDocument";

function formatError(errorText: string): string {
  // Try to parse Zod validation errors
  try {
    // Check if it's a Zod error format
    if (errorText.includes("Type validation failed") || errorText.includes("Error message:")) {
      // Extract the error message array
      const errorMatch = errorText.match(/Error message:\s*(\[[\s\S]*\])/);
      if (errorMatch) {
        const errorArray = JSON.parse(errorMatch[1]);
        if (Array.isArray(errorArray) && errorArray.length > 0) {
          const errors = errorArray.map((err: any) => {
            const path = err.path?.join(".") || "unknown";
            const code = err.code;
            
            // Provide helpful messages for common errors
            if (code === "too_big" && path === "stats.party_loyalty") {
              return `stats.party_loyalty must be a decimal between 0-1 (percentage), not an absolute number. Convert by dividing by total_votes.`;
            }
            if (code === "too_big" && path === "stats.attendance_rate") {
              return `stats.attendance_rate must be a decimal between 0-1 (percentage). Convert by dividing by 100 if it's a percentage.`;
            }
            
            // Generic formatting
            let message = err.message || "";
            if (code === "too_big" && typeof err.maximum === "number") {
              message = `must be ≤ ${err.maximum}`;
            } else if (code === "too_small" && typeof err.minimum === "number") {
              message = `must be ≥ ${err.minimum}`;
            }
            
            return `${path}: ${message}`;
          });
          
          return errors.join("\n");
        }
      }
    }
  } catch {
    // If parsing fails, return original error
  }
  
  // Fallback: return original error text, but try to clean it up
  return errorText
    .replace(/Type validation failed: Value:.*?\.\n/g, "")
    .replace(/Invalid input for tool.*?:\s*/g, "")
    .trim();
}

interface ToolInvocationProps {
  toolName: string;
  input: unknown;
  output: unknown;
  state: string;
  errorText?: string;
}

export function ToolInvocation({
  toolName,
  input,
  output,
  state,
  errorText,
}: ToolInvocationProps) {
  // Tool state - handle both MCP (dynamic-tool) and regular (tool-invocation) states
  // MCP states: input-streaming, input-available, output-available, output-error
  // Regular tool states: partial-call, call, result, error
  const isLoading =
    state === "input-streaming" ||
    state === "input-available" ||
    state === "partial-call" ||
    state === "call";
  const isComplete = state === "output-available" || state === "result";
  const isError = state === "output-error" || state === "error";

  // Check if this is a Riksdag document tool
  const isRiksdagDocument = toolName === "fetch_riksdag_document";
  
  // Extract dok_id from input for Riksdag documents
  const riksdagDokId = isRiksdagDocument && input && typeof input === "object"
    ? (input as { dok_id?: string }).dok_id
    : undefined;

  // Auto-expand for Riksdag documents (once we have a dok_id)
  const [isExpanded, setIsExpanded] = useState(!!riksdagDokId);

  // Map tool names to icons and labels
  const toolConfig: Record<string, { icon: React.ReactNode; label: string }> = {
    list_databases: {
      icon: <DatabaseIcon className="size-3.5" />,
      label: "Listar databaser",
    },
    list_tables: {
      icon: <TableIcon className="size-3.5" />,
      label: "Listar tabeller",
    },
    list_columns: {
      icon: <TableIcon className="size-3.5" />,
      label: "Listar kolumner",
    },
    search_catalog: {
      icon: <SearchIcon className="size-3.5" />,
      label: "Söker i katalogen",
    },
    query: {
      icon: <CodeIcon className="size-3.5" />,
      label: "Kör SQL-fråga",
    },
    ask_docs_question: {
      icon: <BrainIcon className="size-3.5" />,
      label: "Kollar dokumentation",
    },
    fetch_riksdag_document: {
      icon: <FileTextIcon className="size-3.5" />,
      label: "Hämtar riksdagsdokument",
    },
  };

  const config = toolConfig[toolName] || {
    icon: <CodeIcon className="size-3.5" />,
    label: toolName,
  };

  // For Riksdag documents, show the document title in the header if available
  const riksdagLabel = riksdagDokId 
    ? `Dokument ${riksdagDokId}` 
    : config.label;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={defaultTransition}
      className="w-full min-w-0"
    >
      <div className="border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors w-full max-w-full min-w-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2.5 text-sm text-left px-3 py-2.5"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-muted-foreground/70">{config.icon}</span>
            <span className="font-medium text-foreground/80 truncate text-[13px]">
              {isRiksdagDocument ? riksdagLabel : config.label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLoading && (
              <Loader2Icon className="size-3.5 text-primary animate-spin" />
            )}
            {isComplete && (
              <CheckCircleIcon className="size-3.5 text-emerald-500" />
            )}
            {isError && <AlertCircleIcon className="size-3.5 text-red-400" />}
            <ChevronRightIcon
              className={`size-3.5 text-muted-foreground/50 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2.5 text-xs border-t border-border/30 pt-2.5">
            {/* Riksdag document - uses TanStack Query for fetching */}
            {isRiksdagDocument && riksdagDokId ? (
              <RiksdagDocument dokId={riksdagDokId} />
            ) : (
              <>
                {/* Input for other tools */}
                {input !== undefined && input !== null && (
                  <div>
                    <div className="text-muted-foreground mb-1.5 font-medium uppercase tracking-wider text-[10px]">
                      Input
                    </div>
                    <pre className="bg-background/60 p-2.5 rounded-md overflow-x-auto max-h-32 overflow-y-auto text-[11px] leading-relaxed font-mono text-foreground/70">
                      {typeof input === "string"
                        ? input
                        : JSON.stringify(input, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Output for other tools */}
                {isComplete && output !== undefined && output !== null && (
                  <div>
                    <div className="text-muted-foreground mb-1.5 font-medium uppercase tracking-wider text-[10px]">
                      Output
                    </div>
                    <pre className="bg-background/60 p-2.5 rounded-md overflow-x-auto max-h-48 overflow-y-auto text-[11px] leading-relaxed font-mono text-foreground/70">
                      {typeof output === "string"
                        ? output
                        : JSON.stringify(output, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
            
            {isError && errorText && (
              <div className="space-y-1.5">
                <div className="text-red-400 text-[11px] font-medium">Validation Error</div>
                <div className="text-red-300/90 text-[11px] leading-relaxed">
                  {formatError(errorText)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
