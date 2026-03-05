"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { SearchBar } from "@/components/search";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FileText, FlaskConical, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/politiker", label: "Politiker" },
  { href: "/loften", label: "Löften" },
  { href: "/manifesto", label: "Manifest", icon: FileText, secondary: true },
  { href: "/c", label: "Chat", secondary: true },
  { href: "/om/metodik", label: "Metodik", icon: FlaskConical, secondary: true },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      {/* Two thin circles, slightly offset */}
      <circle
        cx="11"
        cy="11"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="13"
        cy="13"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="page-container-wide flex h-14 min-w-0 items-center gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <LogoMark />
          <span className="font-serif font-medium text-sm sm:text-base">
            Politikerkollen
          </span>
        </Link>

        <SearchBar className="hidden sm:block flex-1 min-w-0 max-w-sm" />

        {/* Desktop navigation */}
        <nav className="hidden md:flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1 ml-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

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
                  {Icon && <Icon className="size-4 mr-1.5" />}
                  {item.label}
                </Button>
              </Link>
            );
          })}

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="h-8 ml-1 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Logga ut</span>
            </Button>
          )}
        </nav>

        {/* Mobile navigation */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <Link href="/politiker">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8",
                isActive("/politiker") ? "font-medium" : "text-muted-foreground",
              )}
            >
              Politiker
            </Button>
          </Link>

          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "h-8 w-8"
              )}
            >
              <Menu className="size-5" />
              <span className="sr-only">Öppna meny</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Meny</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <SheetClose
                      key={item.href}
                      render={
                        <Link href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-10",
                              active ? "font-medium bg-muted" : "text-muted-foreground",
                            )}
                          >
                            {Icon && <Icon className="size-4 mr-2" />}
                            {item.label}
                          </Button>
                        </Link>
                      }
                    />
                  );
                })}

                {user && (
                  <>
                    <div className="border-t my-2" />
                    <SheetClose
                      render={
                        <Button
                          variant="ghost"
                          onClick={() => signOut()}
                          className="w-full justify-start h-10 text-muted-foreground hover:text-foreground"
                        >
                          <LogOut className="size-4 mr-2" />
                          Logga ut
                        </Button>
                      }
                    />
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
