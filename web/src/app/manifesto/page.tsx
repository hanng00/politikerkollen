import { SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ManifestoPage() {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip">
      <SiteHeader />

      <article className="page-container-narrow py-12 space-y-12">
        {/* Opening */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Problemet
          </p>
          <h1>Demokratin har ett informationsasymmetriproblem.</h1>
          <p className="text-muted-foreground">
            Politiker kontrollerar sitt narrativ. Medborgare kan inte följa
            hundratals röstningar, motioner och tal. De glömmer löften inom
            månader och har ingen mekanism för ansvarsutkrävande mellan val.
          </p>
          <p>
            <strong>Resultatet:</strong> Politiker säger det som vinner val, sen
            gör de det som tjänar andra intressen. Gapet mellan ord och handling
            döljs av komplexitet och tid.
          </p>
        </section>

        {/* What we're building */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Vad vi bygger
          </p>
          <h2>Demokratisk infrastruktur.</h2>
          <p className="text-muted-foreground">
            Internet har omformat media, handel, kommunikation. Demokratin är en
            av de sista institutionerna som inte fundamentalt omstrukturerats.
            Tills nu.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">
                Status quo
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>Politiker lovar, sen försvinner de i komplexitet</li>
                <li>Medborgare engagerar sig vart fjärde år</li>
                <li>Ansvarsutkrävande kräver journalister</li>
                <li>Informationsasymmetri gynnar politiker</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Efter</p>
              <ul className="space-y-1.5 text-sm">
                <li>Varje löfte spåras, varje röst är synlig</li>
                <li>Kontinuerligt, lågfriktions-engagemang</li>
                <li>Ansvarsutkrävande är automatiskt</li>
                <li>Informationsparitet</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Visionen
          </p>
          <blockquote className="border-l-2 border-primary/30 pl-6">
            <h2>
              Politiker beter sig som om de alltid är bevakade av sina väljare.
              För det är de.
            </h2>
          </blockquote>
          <p className="text-muted-foreground">
            Det är inte övervakning i auktoritär mening. Det är transparens i
            demokratisk mening. Offentliga tjänstemän, som tjänar offentligt,
            med offentliga protokoll, gjorda offentligt tillgängliga.
          </p>
        </section>

        {/* Theory of change */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            THeory
          </p>
          <div className="font-mono text-sm text-muted-foreground bg-card/50 p-6 rounded-lg border space-y-1">
            <p>Medborgare ser motsägelser</p>
            <p className="pl-4">→ Delar dem</p>
            <p className="pl-8">→ Skapar socialt tryck</p>
            <p className="pl-12">→ Politiker fruktar ryktesförlust</p>
            <p className="pl-16">→ Mer konsekvens, eller valförlust</p>
            <p className="pl-20">→ Demokratin fungerar bättre</p>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t">
          <Link href="/">
            <Button size="lg">
              Se motsägelser
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </Link>
        </section>
      </article>

      <footer className="page-container-narrow py-8 border-t text-sm text-muted-foreground">
        Ett verktyg för demokratiskt ansvarsutkrävande.
      </footer>
    </div>
  );
}
