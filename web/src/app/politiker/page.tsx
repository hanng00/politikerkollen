import type { Metadata } from "next";
import PoliticiansPageClient from "./PoliticiansPageClient";

export const metadata: Metadata = {
  title: "Riksdagens ledamöter",
  description:
    "Utforska alla riksdagsledamöter. Sök, filtrera och se hur politikerna röstar, debatterar och arbetar i Sveriges riksdag.",
  openGraph: {
    title: "Riksdagens ledamöter",
    description:
      "Utforska alla riksdagsledamöter. Sök, filtrera och se hur politikerna röstar, debatterar och arbetar i Sveriges riksdag.",
    type: "website",
    siteName: "Politikerkollen",
  },
  twitter: {
    card: "summary",
    title: "Riksdagens ledamöter",
    description:
      "Utforska alla riksdagsledamöter. Sök, filtrera och se hur politikerna röstar, debatterar och arbetar i Sveriges riksdag.",
  },
};

export default function PoliticiansPage() {
  return <PoliticiansPageClient />;
}
