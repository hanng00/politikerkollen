"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationsSidebar } from "@/components/chat/ConversationsSidebar";
import { EmptyState } from "@/components/chat/EmptyState";
import { useAuth } from "@/components/providers/AuthProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCreateConversation } from "@/hooks/useConversations";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const createConversation = useCreateConversation();

  // Create conversation and navigate to it with the initial message
  const handleSubmit = async (text: string) => {
    const newId = await createConversation.mutateAsync();
    // Pass initial message via URL search params
    router.push(`/c/${newId}?m=${encodeURIComponent(text)}`);
  };

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
      <ConversationsSidebar currentConversationId={null} />
      <SidebarInset>
        <div className="relative h-dvh overflow-hidden bg-background">
          <div className="relative flex h-full flex-col px-4 sm:px-6 min-w-0 overflow-hidden">
            <ChatHeader />
            <div className="max-w-2xl mx-auto flex flex-col h-full">
              <EmptyState onPromptClick={handleSubmit} />
              <ChatInput
                onSubmit={handleSubmit}
                status={createConversation.isPending ? "submitted" : "ready"}
                onStop={() => {}}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
