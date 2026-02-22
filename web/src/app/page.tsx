"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

import { SiteHeader } from "@/components/layout";
import { SearchBar } from "@/components/search";
import { Button } from "@/components/ui/button";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex-1 flex items-center justify-center px-4 py-16 relative">
          <div className="absolute inset-0 pattern-grid-subtle" />
          <motion.div 
            className="page-container-narrow text-center space-y-6 relative z-10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="space-y-4" variants={fadeIn}>
              <h1>Vad gör dina politiker?</h1>
              <p className="page-subtitle">
                Demokratin lider av strukturell informationsasymmetri.
                <br />
                <span className="text-foreground">
                  Nu är varje handling spårbar.
                </span>
              </p>
            </motion.div>

            {/* Search */}
            <motion.div variants={fadeInUp}>
              <SearchBar size="lg" className="mx-auto" />
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeInUp}>
              <Button variant="outline" onClick={() => router.push("/politiker")}>
                Utforska alla ledamöter
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t py-6">
          <div className="page-container text-center text-muted-foreground">
            <p className="text-sm">
              Ett verktyg för demokratiskt ansvarsutkrävande.
            </p>
            <p className="text-sm mt-1">
              Data från{" "}
              <a
                href="https://data.riksdagen.se"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Riksdagens öppna data
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
