import { SiteHeader, SiteFooter } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { reports } from "./data";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Zap, Building2, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Politisk Intelligence",
  description: "AI-driven analys av retoriska skiftningar och trender i svensk politik.",
};

const verticalConfig = {
  energi: {
    label: "Energi",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  fastighet: {
    label: "Fastighet",
    icon: Building2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  general: {
    label: "Allmänt",
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

export default function RapporterPage() {
  const featuredReports = reports.filter(r => r.iteration && r.iteration >= 2);
  const otherReports = reports.filter(r => !r.iteration || r.iteration < 2);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <section className="page-container py-10 md:py-14">
          <div className="text-center mb-10 space-y-3">
            <h2>Politisk Intelligence</h2>
            <p className="page-subtitle">
              Djupgående analyser av lagstiftningsprocesser och politiska skiftningar.
            </p>
          </div>

          {/* Featured Reports */}
          {featuredReports.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Fullständiga analyser</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-6">
                {featuredReports.map((report) => {
                  const vertical = verticalConfig[report.vertical];
                  const Icon = vertical.icon;

                  return (
                    <Link key={report.id} href={`/rapporter/${report.id}`}>
                      <Card className="transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-lg cursor-pointer group border-primary/20 bg-primary/[0.02]">
                        <div className="md:flex">
                          <CardHeader className="md:flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                Fullständig analys
                              </Badge>
                              <div className={`p-1.5 rounded-md ${vertical.bgColor}`}>
                                <Icon className={`size-4 ${vertical.color}`} />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {vertical.label}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(report.date).toLocaleDateString("sv-SE", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              {report.title}
                            </CardTitle>
                            <CardDescription className="text-base">
                              {report.subtitle}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="md:w-80 md:border-l md:flex md:flex-col md:justify-center">
                            <p className="text-sm text-muted-foreground mb-4">
                              {report.summary}
                            </p>
                            <div className="flex items-center text-sm text-primary font-medium">
                              Läs rapporten
                              <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Reports */}
          {otherReports.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Signaler & trender</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {otherReports.map((report) => {
                  const vertical = verticalConfig[report.vertical];
                  const Icon = vertical.icon;

                  return (
                    <Link key={report.id} href={`/rapporter/${report.id}`}>
                      <Card className="h-full transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-lg cursor-pointer group">
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className={`p-1.5 rounded-md ${vertical.bgColor}`}>
                              <Icon className={`size-4 ${vertical.color}`} />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {vertical.label}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(report.date).toLocaleDateString("sv-SE", {
                                year: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {report.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {report.subtitle}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {report.summary}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {report.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center text-sm text-primary font-medium">
                            Läs rapporten
                            <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="border-t bg-muted/30">
          <div className="page-container py-10 md:py-14">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl mb-4">Vill du ha dessa insikter varje vecka?</h2>
              <p className="text-muted-foreground mb-6">
                Vi bygger en tjänst för Public Affairs-proffs som vill ligga steget före.
                Kontakta oss för att diskutera hur vi kan hjälpa er.
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
