"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { SearchBar } from "@/components/search";
import { Button } from "@/components/ui/button";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";

export function Hero() {
  return (
    <section className="flex items-center justify-center px-4 py-16 md:py-24 relative">
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

        <motion.div variants={fadeInUp}>
          <SearchBar size="lg" className="mx-auto" />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Link href="/politiker">
            <Button variant="outline">
              Utforska alla ledamöter
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
