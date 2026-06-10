import { Suspense } from "react";
import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Lab",
  description: "Förhandsvisning av experimentella funktioner.",
  robots: { index: false, follow: false },
};

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
