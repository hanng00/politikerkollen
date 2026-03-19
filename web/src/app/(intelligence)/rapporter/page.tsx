import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, TrendingUp, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { reports } from "./data";

export const metadata: Metadata = {
  title: "Politisk Intelligence",
  description:
    "AI-driven analys av retoriska skiftningar och trender i svensk politik.",
};

const verticalConfig = {
  energi: {
    label: "Energi",
    icon: Zap,
  },
  fastighet: {
    label: "Fastighet",
    icon: Building2,
  },
  general: {
    label: "Allmänt",
    icon: TrendingUp,
  },
};

export default function RapporterPage() {
  const featuredReports = reports.filter(
    (r) => r.iteration && r.iteration >= 2,
  );
  const otherReports = reports.filter((r) => !r.iteration || r.iteration < 2);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <section className="page-container py-10 md:py-14">
          <div className="text-center mb-12 space-y-3">
            <h2>Politisk Intelligence</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Djupgående analyser av lagstiftningsprocesser och politiska
              skiftningar.
            </p>
          </div>

          {/* Featured Reports */}
          {featuredReports.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fullständiga analyser
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-6">
                {featuredReports.map((report) => {
                  const vertical = verticalConfig[report.vertical];
                  const Icon = vertical.icon;

                  return (
                    <Link key={report.id} href={`/rapporter/${report.id}`} className="block group">
                      <article className="md:flex gap-8 p-6 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                        <div className="md:flex-1 mb-4 md:mb-0">
                          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                            <Icon className="size-4" />
                            <span>{vertical.label}</span>
                            <span>·</span>
                            <time>
                              {new Date(report.date).toLocaleDateString("sv-SE", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </time>
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                            {report.title}
                          </h3>
                          <p className="text-muted-foreground">
                            {report.subtitle}
                          </p>
                        </div>
                        <div className="md:w-72 md:border-l md:pl-8 flex flex-col justify-center">
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                            {report.summary}
                          </p>
                          <span className="text-sm text-primary font-medium inline-flex items-center">
                            Läs rapporten
                            <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Reports */}
          {otherReports.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signaler & trender
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {otherReports.map((report) => {
                  const vertical = verticalConfig[report.vertical];
                  const Icon = vertical.icon;

                  return (
                    <Link key={report.id} href={`/rapporter/${report.id}`} className="block group">
                      <article className="h-full p-5 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Icon className="size-4" />
                          <span>{vertical.label}</span>
                          <span className="ml-auto">
                            {new Date(report.date).toLocaleDateString("sv-SE", {
                              year: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                          {report.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {report.subtitle}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {report.summary}
                        </p>
                        <span className="text-sm text-primary font-medium inline-flex items-center">
                          Läs mer
                          <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="border-t bg-muted/30">
          <div className="page-container py-12">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-xl font-semibold mb-4">
                Vill du ha dessa insikter varje vecka?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vi bygger en tjänst för Public Affairs-proffs som vill ligga
                steget före. Kontakta oss för att diskutera hur vi kan hjälpa
                er.
              </p>
              <a
                href="tel:+46763281170"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Boka ett samtal
              </a>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
