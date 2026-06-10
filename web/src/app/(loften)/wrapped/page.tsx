import type { Metadata } from "next";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { WrappedPicker } from "@/components/loops/wrapped";

export const metadata: Metadata = {
  title: "Riksdagen Wrapped",
  description:
    "En svepbar återblick i Spotify-Wrapped-stil på ett partis mandatperiod: röster, närvaro och hållna löften.",
};

export default function WrappedIndexPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <WrappedPicker />
        <SiteFooter />
      </main>
    </div>
  );
}
