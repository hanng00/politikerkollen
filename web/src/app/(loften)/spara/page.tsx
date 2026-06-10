import type { Metadata } from "next";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { SparaExperience } from "@/components/loops/spara";

export const metadata: Metadata = {
  title: "Spåra hen",
  description:
    "Följ ett parti och få en varning när ett vallöfte bryts. Dela varje varning vidare.",
};

export default function SparaPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <SparaExperience />
        <SiteFooter />
      </main>
    </div>
  );
}
