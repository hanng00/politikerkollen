"use client";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useConversationsList } from "@/hooks/useConversations";
import { MessageIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

interface ConversationsSidebarProps {
  currentConversationId: string | null;
  onNew?: () => void;
}

export function ConversationsSidebar({
  currentConversationId,
  onNew,
}: ConversationsSidebarProps) {
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();
  const { data, isLoading } = useConversationsList();

  const conversations = data?.conversations ?? [];

  const handleSelect = (id: string) => {
    router.push(`/c/${id}`);
    if (isMobile) setOpenMobile(false);
  };

  const handleNew = () => {
    router.push("/c");
    if (isMobile) setOpenMobile(false);
    onNew?.();
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNew}
            className="h-7 w-7"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            <span className="sr-only">New conversation</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Loading...
                  </div>
                </SidebarMenuItem>
              ) : conversations.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No conversations yet
                  </div>
                </SidebarMenuItem>
              ) : (
                conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      isActive={conv.id === currentConversationId}
                      onClick={() => handleSelect(conv.id)}
                      className="w-full justify-start"
                    >
                      <HugeiconsIcon
                        icon={MessageIcon}
                        className="size-4 shrink-0"
                      />
                      <span className="truncate flex-1 text-left">
                        {conv.title || "New Conversation"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function ConversationsSidebarTrigger() {
  return <SidebarTrigger />;
}
