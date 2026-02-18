"use client";

import { Button } from "@/components/ui/button";

const PARTIES = ["S", "M", "SD", "C", "V", "KD", "L", "MP"] as const;

interface PartyFilterProps {
  value: string | null;
  onChange: (party: string | null) => void;
}

export function PartyFilter({ value, onChange }: PartyFilterProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Button
        variant={value === null ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange(null)}
      >
        Alla partier
      </Button>
      {PARTIES.map((party) => (
        <Button
          key={party}
          variant={value === party ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(party)}
        >
          {party}
        </Button>
      ))}
    </div>
  );
}
