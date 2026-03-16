import { SiteHeader, SiteFooter } from "@/components/layout";
import type { Metadata } from "next";
import { InfluenceMethodology } from "./InfluenceMethodology";
import { PromiseTrackingMethodology } from "./PromiseTrackingMethodology";

export const metadata: Metadata = {
  title: "Metodik — Politikerkollen",
  description:
    "Hur vi mäter och analyserar politikers arbete i riksdagen. Transparent metodik för demokratisk insyn.",
  openGraph: {
    title: "Metodik — Politikerkollen",
    description:
      "Hur vi mäter och analyserar politikers arbete i riksdagen. Transparent metodik för demokratisk insyn.",
    type: "article",
    siteName: "Politikerkollen",
  },
};

export default function MethodologyPage() {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip">
      <SiteHeader />

      <div className="page-container py-12 space-y-16">
        <header className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="page-title">Metodik</h1>
          <p className="text-lg text-muted-foreground">
            Transparent analys av politiskt arbete. Varje modell vi använder
            förklaras här.
          </p>
        </header>

        <div className="space-y-8">
          <PromiseTrackingMethodology />
          <InfluenceMethodology />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
