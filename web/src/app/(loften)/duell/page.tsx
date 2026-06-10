import type { Metadata } from "next";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { DuellExperience } from "@/components/loops/duell";

export const metadata: Metadata = {
  title: "Spelar de roll?",
  description:
    "Svep-duell: de sa något — gjorde de det? Gissa höll eller bröt, se sanningen och dela ditt resultat.",
};

export default function DuellPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <DuellExperience />
        <SiteFooter />
      </main>
    </div>
  );
}
