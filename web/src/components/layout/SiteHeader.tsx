"use client";

import { SearchBar } from "@/components/search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Motsägelser", exact: true },
  { href: "/politiker", label: "Politiker" },
  { href: "/manifesto", label: "Manifest", icon: FileText, secondary: true },
  { href: "/c", label: "Chat", secondary: true },
];

export function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="page-container-wide flex h-14 min-w-0 items-center gap-2 sm:gap-4">
        <Link href="/" className="font-semibold shrink-0 text-sm sm:text-base">
          Politikerkollen
        </Link>

        <SearchBar className="hidden sm:block flex-1 min-w-0 max-w-sm" />

        <nav className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1 ml-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;

            if (item.secondary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hidden md:block"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8",
                      active ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {Icon && <Icon className="size-4 mr-1.5" />}
                    {item.label}
                  </Button>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8",
                    active ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}

          {/* Voter Guide */}
          <Link href="/val" className="ml-1 sm:ml-2 shrink-0">
            <Button
              size="sm"
              className={cn("h-8 text-xs sm:text-sm px-2 sm:px-3", isActive("/val") && "bg-primary/90")}
            >
              <span className="hidden sm:inline">Val 2026</span>
              <span className="sm:hidden">Val</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
