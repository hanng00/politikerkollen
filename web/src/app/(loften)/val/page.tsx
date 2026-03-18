import { SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Valguide 2026",
  description:
    "Valguiden kommer snart. Se hur kandidaterna i din valkrets faktiskt har röstat.",
  robots: { index: false, follow: false },
};

export default function VoterGuidePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />
      <main className="page-container py-20 md:py-32">
        <div className="max-w-md mx-auto text-center space-y-6">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Kommer snart
          </p>
          <h1 className="text-2xl font-bold">Valguide 2026</h1>
          <p className="text-muted-foreground">
            Vi bygger en valguide som visar hur kandidaterna i din valkrets
            faktiskt har röstat — inte bara vad de lovar. Den är inte klar än.
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
