import { LogoMark, SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manifest",
  description:
    "Demokratin lider av strukturell informationsasymmetri. Vi bygger infrastruktur för spårbarhet och ansvarsutkrävande.",
  openGraph: {
    title: "Manifest — Politikerkollen",
    description:
      "Demokratin lider av strukturell informationsasymmetri. Vi bygger infrastruktur för spårbarhet och ansvarsutkrävande.",
    type: "article",
    siteName: "Politikerkollen",
  },
};

export default function ManifestoPage() {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip">
      <SiteHeader />

      <article className="page-container-narrow py-12 space-y-12">
        {/* Title */}
        <div className="page-title flex flex-row items-center gap-3">
          <LogoMark className="size-10" />
          <h1>Politikerkollen</h1>
        </div>

        {/* Problemet */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Problemet
          </p>
          <h2>Demokratin lider av strukturell informationsasymmetri.</h2>
          <p className="text-muted-foreground">
            Politiker kontrollerar sitt budskap. Medborgare saknar kapacitet att
            följa hundratals röstningar, motioner och anföranden. Löften
            fragmenteras över tid. Mekanismer för löpande ansvarsutkrävande är
            svaga mellan val.
          </p>
          <p>
            Konsekvensen är ett system där retorik och faktisk handling glider
            isär. Komplexitet och tid fungerar som skydd.
          </p>
        </section>

        {/* Vad vi bygger */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Vad vi bygger
          </p>
          <h2>
            Demokratisk infrastruktur för spårbarhet och ansvarsutkrävande.
          </h2>
          <p className="text-muted-foreground">
            Internet har omformat medier, marknader och kommunikation. Den
            representativa demokratins informationslager är i huvudsak
            oförändrat.
          </p>
          <p>
            Vi etablerar ett offentligt, maskinellt index över politiska löften
            och faktiska handlingar.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">
                Status quo
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>Löften saknar systematisk uppföljning</li>
                <li>Politiskt deltagande koncentreras till valcykler</li>
                <li>
                  Ansvarsutkrävande är beroende av redaktionella prioriteringar
                </li>
                <li>Informationsasymmetri gynnar makthavare</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Efter</p>
              <ul className="space-y-1.5 text-sm">
                <li>
                  Löften, röstningar och ställningstaganden länkas och
                  tidsstämplas
                </li>
                <li>Kontinuerlig, lågfriktionsbaserad medborgarinsyn</li>
                <li>Datadrivet ansvarsutkrävande</li>
                <li>Informationsparitet mellan väljare och valda</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Vision
          </p>
          <blockquote className="border-l-2 border-primary/30 pl-6">
            <h2>Politiskt agerande sker under permanent offentlig insyn.</h2>
            <p className="mt-2 text-muted-foreground">
              Inte övervakning. Transparens.
            </p>
          </blockquote>
          <p className="text-muted-foreground">
            Offentliga företrädare verkar genom offentliga mandat, dokumenterade
            i offentliga protokoll. Dessa ska vara strukturerade, sökbara och
            jämförbara i realtid.
          </p>
        </section>

        {/* Teori om förändring */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Teori om förändring
          </p>
          <div className="font-mono text-sm text-muted-foreground bg-card/50 p-6 rounded-lg border space-y-1">
            <p>Synliggjorda motsägelser</p>
            <p className="pl-4">→ Distribueras socialt</p>
            <p className="pl-8">→ Skapar reputationsrisk</p>
            <p className="pl-12">→ Ökar kostnaden för inkonsekvens</p>
            <p className="pl-16">
              → Driver strategisk anpassning eller leder till valförlust
            </p>
            <p className="pl-20">→ Stärker demokratins funktion</p>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t">
          <Link href="/politiker">
            <Button size="lg">
              Utforska riksdagsledamöter
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </Link>
        </section>
      </article>

      <footer className="page-container-narrow py-8 border-t text-sm text-muted-foreground">
        Ett verktyg för systematiskt, kontinuerligt demokratiskt
        ansvarsutkrävande.
      </footer>
    </div>
  );
}
