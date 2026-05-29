"use client";

import { useAuth } from "@/components/providers/AuthProvider";
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
import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/loften", label: "Löften" },
  { href: "/parti", label: "Partier" },
  { href: "/rapporter", label: "Intelligence" },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
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

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="page-container-wide flex h-14 items-center">
        <Link href="/" className="flex items-center gap-1.5">
          <LogoMark />
          <span className="font-serif font-medium">
            Politikerkollen
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8",
                  isActive(item.href) ? "font-medium" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Button>
            </Link>
          ))}

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="h-8 ml-1 text-muted-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </nav>

        {/* Mobile navigation */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "h-8 w-8",
              )}
            >
              <Menu className="size-5" />
              <span className="sr-only">Meny</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Meny</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((item) => (
                  <SheetClose
                    key={item.href}
                    nativeButton={false}
                    render={
                      <Link href={item.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-10",
                            isActive(item.href)
                              ? "font-medium bg-muted"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    }
                  />
                ))}

                {user && (
                  <>
                    <div className="border-t my-2" />
                    <SheetClose
                      render={
                        <Button
                          variant="ghost"
                          onClick={() => signOut()}
                          className="w-full justify-start h-10 text-muted-foreground"
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
