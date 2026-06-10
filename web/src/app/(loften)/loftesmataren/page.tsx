import type { Metadata } from "next";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { LoftesmataretCounter } from "@/components/loops/loftesmataren";

export const metadata: Metadata = {
  title: "Löftesmätaren",
  description:
    "Live-räknare över brutna vallöften sedan valet 2022. Varje rad länkar till underlaget i riksdagen. Bädda in på din sajt.",
};

export default function LoftesmataretPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <LoftesmataretCounter live />
        <SiteFooter />
      </main>
    </div>
  );
}
