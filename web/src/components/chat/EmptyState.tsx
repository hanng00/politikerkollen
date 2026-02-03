"use client";

import { motion } from "motion/react";
import {
  fadeInUp,
  staggerContainer,
  defaultTransition,
} from "@/lib/animations";
import { Button } from "@/components/ui/button";

const EXAMPLE_PROMPTS = [
  "Vilka ledamöter har högst frånvaro?",
  "Hur röstade riksdagen om migration senaste året?",
  "Jämför M och SD:s röstmönster",
  "Vilka partier röstar oftast lika?",
];

interface EmptyStateProps {
  onPromptClick?: (prompt: string) => void;
}

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="flex flex-col items-center justify-center flex-1 text-center px-4"
    >
      <motion.div variants={fadeInUp} transition={defaultTransition}>
        <h2 className="text-xl font-medium mb-3 text-foreground">
          Välkommen till Politikerkollen
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">
          Ställ frågor om svenska politiker, riksdagsbeslut och politiska
          frågor.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        transition={defaultTransition}
        className="flex flex-wrap justify-center gap-2 max-w-md"
      >
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            onClick={() => onPromptClick?.(prompt)}
            className="text-muted-foreground hover:text-foreground"
          >
            {prompt}
          </Button>
        ))}
      </motion.div>
    </motion.div>
  );
}
