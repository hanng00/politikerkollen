import { SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Motsägelser",
  description:
    "Motsägelsedetektorn kommer snart. Vi bygger verktyg för att jämföra vad politiker säger med hur de röstar.",
  robots: { index: false, follow: false },
};

export default function MotsagelsePage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="page-container py-20 md:py-32">
        <div className="max-w-md mx-auto text-center space-y-6">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Kommer snart
          </p>
          <h1 className="text-2xl font-bold">Motsägelsedetektorn</h1>
          <p className="text-muted-foreground">
            Vi bygger ett verktyg som systematiskt jämför vad politiker säger med
            hur de faktiskt röstar. Det är inte klart än.
          </p>
          <Link href="/politiker">
            <Button variant="outline">
              Utforska riksdagsledamöter
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
