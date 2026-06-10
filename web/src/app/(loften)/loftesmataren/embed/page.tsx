import type { Metadata } from "next";

import { EmbedWidget } from "@/components/loops/loftesmataren";

export const metadata: Metadata = {
  title: "Löftesmätaren – inbäddning",
  robots: { index: false, follow: false },
};

/** Bare widget intended to be embedded via <iframe>. */
export default function LoftesmataretEmbedPage() {
  return (
    <main className="p-2">
      <EmbedWidget />
    </main>
  );
}
