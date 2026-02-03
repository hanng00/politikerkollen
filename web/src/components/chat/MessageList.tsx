"use client";

import { motion } from "motion/react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { slideInLeft, slideInRight, defaultTransition } from "@/lib/animations";
import { PartRenderer } from "./PartRenderer";
import { ToolLoading } from "./ToolLoading";

import type { UIMessage } from "@ai-sdk/react";

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex-1 min-h-0 space-y-4 overflow-y-auto py-5 scrollbar-thin">
      {messages.length === 0 ? null : (
        <>
          {messages.map((m) => {
            const isUser = m.role === "user";
            const messageRole = m.role === "system" ? "assistant" : m.role;

            return (
              <motion.div
                key={m.id}
                initial="hidden"
                animate="visible"
                variants={isUser ? slideInRight : slideInLeft}
                transition={defaultTransition}
              >
                <Message from={messageRole}>
                  <MessageContent>
                    <div className="space-y-3">
                      {m.parts.map((part, i) => (
                        <PartRenderer
                          key={i}
                          part={
                            part as Parameters<typeof PartRenderer>[0]["part"]
                          }
                          index={i}
                          role={m.role}
                        />
                      ))}
                    </div>
                  </MessageContent>
                </Message>
              </motion.div>
            );
          })}

          {isLoading && messages.at(-1)?.role === "user" && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={slideInLeft}
              transition={defaultTransition}
            >
              <Message from="assistant">
                <MessageContent>
                  <ToolLoading message="Tänker..." />
                </MessageContent>
              </Message>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
