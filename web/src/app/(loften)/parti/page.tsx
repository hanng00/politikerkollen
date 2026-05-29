import type { Metadata } from "next";
import PartyIndexClient from "./PartyIndexClient";

export const metadata: Metadata = {
  title: "Partier — Politikerkollen",
  description:
    "Se hur alla riksdagspartier har uppfyllt sina vallöften från 2022. Jämför genomförandegrad och se vilka partier som håller vad de lovar.",
  openGraph: {
    title: "Partier — Politikerkollen",
    description:
      "Se hur alla riksdagspartier har uppfyllt sina vallöften från 2022. Jämför genomförandegrad och se vilka partier som håller vad de lovar.",
    type: "website",
    siteName: "Politikerkollen",
  },
};

export default function PartyIndexPage() {
  return <PartyIndexClient />;
}
