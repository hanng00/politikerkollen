"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useFetchPoliticians, useDebounce } from "@/hooks";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use server-side fuzzy search when there's a query
  const { data: politicians, isLoading } = useFetchPoliticians({
    search: debouncedQuery || undefined,
    limit: 6,
  });

  // Only show results when we have a query
  const filtered = debouncedQuery ? politicians : undefined;

  const handleSelect = useCallback((politicianId: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/politiker/${politicianId}`);
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showResults = open && query.length > 0 && !isLoading;

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder="Sök politiker..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-md">
          <Command>
            <CommandList>
              {filtered?.length === 0 && (
                <CommandEmpty>Inga politiker hittades</CommandEmpty>
              )}
              {filtered && filtered.length > 0 && (
                <CommandGroup heading="Politiker">
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.firstName} ${p.lastName}`}
                      onSelect={() => handleSelect(p.id)}
                    >
                      <User className="size-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{p.firstName} {p.lastName}</span>
                        <span className="text-muted-foreground">{p.party} · {p.constituency}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
