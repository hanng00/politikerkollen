"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function Page() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    // Auto-submit when all tool results are available (for multi-step agent loop)
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <div className="relative mx-auto flex h-full max-w-2xl flex-col px-4 sm:px-6 min-w-0 overflow-hidden">
        <ChatHeader />

        {!hasMessages ? (
          <EmptyState onPromptClick={(text) => sendMessage({ text })} />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}

        <ChatInput
          onSubmit={(text) => sendMessage({ text })}
          status={status}
          onStop={stop}
        />
      </div>
    </div>
  );
}
