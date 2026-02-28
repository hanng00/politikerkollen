"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ArrowDownWideNarrow } from "lucide-react";
import type { SortOption } from "@/hooks";

const SORT_ITEMS = [
  { value: "mostEffective", label: "Mest genomslag" },
  { value: "mostRebel", label: "Mest oberoende" },
  { value: "mostActive", label: "Mest aktiva" },
  { value: "name", label: "Namn A-Ö" },
] as const;

interface SortFilterProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortFilter({ value, onChange }: SortFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-auto min-w-[160px] h-8 text-sm">
        <ArrowDownWideNarrow className="size-3.5 mr-1 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left">
          {SORT_ITEMS.find((i) => i.value === value)?.label ?? "Sortera"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {SORT_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
