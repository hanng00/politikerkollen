"use client";

import { motion } from "motion/react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { fadeInUp, defaultTransition } from "@/lib/animations";
import type { UseChatReturn } from "@ai-sdk/react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  status: UseChatReturn["status"];
  onStop: () => void;
}

export function ChatInput({ onSubmit, status, onStop }: ChatInputProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={defaultTransition}
      className="relative py-5 shrink-0"
    >
      <PromptInput
        onSubmit={({ text }) => onSubmit(text)}
        className="relative border border-border rounded-xl bg-background"
      >
        <PromptInputTextarea 
          placeholder="Ställ en fråga om svensk politik..." 
          className="text-[15px]"
        />
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">
            Enter för att skicka
          </span>
          <PromptInputSubmit status={status} onStop={onStop} />
        </PromptInputFooter>
      </PromptInput>
    </motion.div>
  );
}
