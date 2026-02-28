"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchPoliticians, useDebounce } from "@/hooks";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  size?: "default" | "lg";
}

export function SearchBar({ className, size = "default" }: SearchBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use server-side fuzzy search when there's a query
  const { data: politicians, isLoading } = useFetchPoliticians({
    search: debouncedQuery || undefined,
    limit: 5,
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

  const showResults = open && query.length > 0;
  const showLoading = showResults && isLoading;

  const isLarge = size === "lg";

  return (
    <div ref={containerRef} className={cn("relative w-full", isLarge ? "max-w-lg" : "max-w-md", className)}>
      <Search className={cn(
        "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
        isLarge ? "left-4 size-5" : "left-3 size-4"
      )} />
      <input
        type="text"
        placeholder="Sök politiker..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          "w-full rounded-lg border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          isLarge ? "h-12 pl-12 pr-4 text-base" : "h-10 pl-10 pr-4 text-sm"
        )}
      />
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-md">
          <Command>
            <CommandList>
              {showLoading ? (
                <div className="p-2 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="size-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : filtered?.length === 0 ? (
                <CommandEmpty>Inga politiker hittades</CommandEmpty>
              ) : filtered && filtered.length > 0 ? (
                <CommandGroup>
                  {filtered.map((p) => {
                    const initials = `${p.firstName[0]}${p.lastName[0]}`;
                    const hasActivity = p.stats.totalVotes > 0 || p.stats.totalSpeeches > 0;
                    
                    return (
                      <CommandItem
                        key={p.id}
                        value={`${p.firstName} ${p.lastName}`}
                        onSelect={() => handleSelect(p.id)}
                        className="py-3"
                      >
                        <Avatar>
                          {p.imageUrl && <AvatarImage src={p.imageUrl} alt={p.name} />}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">({p.party})</span>
                          </div>
                          <span className="text-sm text-muted-foreground truncate">
                            {p.status} · {p.constituency}
                          </span>
                        </div>
                        {hasActivity && (
                          <div className="text-right text-xs text-muted-foreground shrink-0 tabular-nums">
                            <div>{p.stats.totalVotes.toLocaleString("sv-SE")} röster</div>
                            {p.stats.rebelVoteCount > 0 && (
                              <div className="text-warning">{p.stats.rebelVoteCount.toLocaleString("sv-SE")} rebellröster</div>
                            )}
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
