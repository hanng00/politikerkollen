"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type ActivityFilterValue = "all" | "active" | "veryActive";

const ACTIVITY_ITEMS = [
  { value: "all", label: "Alla aktivitetsnivåer" },
  { value: "active", label: "Aktiva (100+)" },
  { value: "veryActive", label: "Mycket aktiva (500+)" },
] as const;

interface ActivityFilterProps {
  value: ActivityFilterValue;
  onChange: (value: ActivityFilterValue) => void;
}

export function ActivityFilter({ value, onChange }: ActivityFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ActivityFilterValue)}>
      <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm">
        <span className="flex-1 text-left">
          {ACTIVITY_ITEMS.find((i) => i.value === value)?.label}
        </span>
      </SelectTrigger>
      <SelectContent>
        {ACTIVITY_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
