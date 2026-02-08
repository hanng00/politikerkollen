"use client";

import { motion } from "motion/react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ConversationsSidebarTrigger } from "@/components/chat/ConversationsSidebar";

export function ChatHeader() {
  const { user, signOut } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between py-6 border-b border-border shrink-0"
    >
      <div className="w-24 flex justify-start">
        <ConversationsSidebarTrigger />
      </div>
      <h1 className="text-lg font-medium tracking-tight text-foreground">
        Politikerkollen
      </h1>
      <div className="w-24 flex justify-end">
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Button>
        )}
      </div>
    </motion.header>
  );
}
