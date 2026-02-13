"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RankBadgeProps {
  rank: number;
  total: number;
  percentile: number;
}

export function RankBadge({ rank, total, percentile }: RankBadgeProps) {
  const isBottom = percentile < 30;

  return (
    <Tooltip>
      <TooltipTrigger
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-default ${
          isBottom
            ? "bg-destructive/10 text-destructive"
            : "bg-success/10 text-success"
        }`}
      >
        {isBottom ? (
          <ArrowDownRight className="size-3" />
        ) : (
          <ArrowUpRight className="size-3" />
        )}
        #{rank} av {total}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isBottom
            ? `Mindre konsekvent än ${100 - percentile}% av riksdagsledamöterna`
            : `Mer konsekvent än ${percentile}% av riksdagsledamöterna`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
