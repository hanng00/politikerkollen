import type { Metadata } from "next";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { ValkretsExperience } from "@/components/loops/valkrets";

export const metadata: Metadata = {
  title: "Min valkrets",
  description:
    "Skriv ditt postnummer och se hur partierna i din valkrets hållit sina vallöften — med betyg från A till F.",
};

export default function ValkretsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <ValkretsExperience />
        <SiteFooter />
      </main>
    </div>
  );
}
