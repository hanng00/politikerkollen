"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationsSidebar } from "@/components/chat/ConversationsSidebar";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { useAuth } from "@/components/providers/AuthProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useConversationMessages } from "@/hooks/useConversations";
import { getChatEndpoint } from "@/lib/config";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConversationPage({ params }: PageProps) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("m");
  const hasSentInitialMessage = useRef(false);
  
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth();
  const { data: messagesData, isLoading: isLoadingMessages } =
    useConversationMessages(conversationId);

  // Custom fetch: adds auth header and transforms body
  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getAccessToken();
      const body = init?.body
        ? typeof init.body === "string"
          ? JSON.parse(init.body)
          : {}
        : {};
      const messages = (body.messages as UIMessage[] | undefined) ?? [];
      const lastMessage = messages[messages.length - 1];

      return fetch(input, {
        ...init,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: lastMessage }),
      });
    },
    [getAccessToken],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getChatEndpoint()}/c/${conversationId}/chat`,
        fetch: customFetch,
      }),
    [conversationId, customFetch],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: conversationId,
    transport,
  });

  // Sync fetched messages into useChat state when data loads
  useEffect(() => {
    if (messagesData?.messages && messagesData.messages.length > 0) {
      setMessages(messagesData.messages);
    }
  }, [messagesData?.messages, setMessages]);

  // Auto-send initial message from URL params (when redirected from home page)
  useEffect(() => {
    if (
      initialMessage &&
      !hasSentInitialMessage.current &&
      !isLoadingMessages &&
      status === "ready"
    ) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: initialMessage });
      // Clean up URL by removing the message param
      router.replace(`/c/${conversationId}`, { scroll: false });
    }
  }, [initialMessage, isLoadingMessages, status, sendMessage, router, conversationId]);

  const isLoading = status === "submitted" || status === "streaming";

  if (authLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative flex h-dvh items-center justify-center bg-background px-4 overflow-hidden">
        <AuthForm />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <ConversationsSidebar currentConversationId={conversationId} />
      <SidebarInset>
        <div className="relative h-dvh overflow-hidden bg-background">
          <div className="relative mx-auto flex h-full max-w-2xl flex-col px-4 sm:px-6 min-w-0 overflow-hidden">
            <ChatHeader />

            {isLoadingMessages ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                  Laddar...
                </div>
              </div>
            ) : messages.length === 0 ? (
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
      </SidebarInset>
    </SidebarProvider>
  );
}
