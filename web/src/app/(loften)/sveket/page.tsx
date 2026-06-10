import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { SveketExperience } from "@/components/loops/sveket";

export const metadata: Metadata = {
  title: "Sveks-kvittot",
  description:
    "Välj ett parti och få ett kvitto på vilka vallöften som hållits — och vilka som brutits — sedan valet 2022.",
};

export default function SveketPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={null}>
          <SveketExperience />
        </Suspense>
        <SiteFooter />
      </main>
    </div>
  );
}
