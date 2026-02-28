"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

// Swedish constituencies (valkretsar)
const CONSTITUENCIES = [
  "Blekinge län",
  "Dalarnas län",
  "Gotlands län",
  "Gävleborgs län",
  "Hallands län",
  "Jämtlands län",
  "Jönköpings län",
  "Kalmar län",
  "Kronobergs län",
  "Norrbottens län",
  "Skåne läns norra och östra",
  "Skåne läns södra",
  "Skåne läns västra",
  "Stockholms kommun",
  "Stockholms län",
  "Södermanlands län",
  "Uppsala län",
  "Värmlands län",
  "Västerbottens län",
  "Västernorrlands län",
  "Västmanlands län",
  "Västra Götalands läns norra",
  "Västra Götalands läns södra",
  "Västra Götalands läns västra",
  "Västra Götalands läns östra",
  "Örebro län",
  "Östergötlands län",
];

interface ConstituencyFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ConstituencyFilter({ value, onChange }: ConstituencyFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-auto min-w-[180px] h-8 text-sm">
        <MapPin className="size-3.5 mr-1 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">
          {value ?? "Alla valkretsar"}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alla valkretsar</SelectItem>
        {CONSTITUENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
