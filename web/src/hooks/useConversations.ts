"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UIMessage } from "ai";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

/** Fetch helper with auth */
async function authFetch(
  url: string,
  getAccessToken: () => Promise<string | null>,
  options?: RequestInit
) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** Hook for listing conversations */
export function useConversationsList() {
  const { getAccessToken } = useAuth();

  return useQuery<{ conversations: Conversation[] }>({
    queryKey: ["conversations"],
    queryFn: () => authFetch(`${API_ENDPOINT}/c`, getAccessToken),
  });
}

/** Hook for creating a new conversation */
export function useCreateConversation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await authFetch(`${API_ENDPOINT}/c`, getAccessToken, {
        method: "POST",
        body: JSON.stringify({}),
      });
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Hook for fetching messages of a conversation */
export function useConversationMessages(conversationId: string | null) {
  const { getAccessToken } = useAuth();

  return useQuery<{ messages: UIMessage[] }>({
    queryKey: ["conversation-messages", conversationId],
    queryFn: () =>
      authFetch(`${API_ENDPOINT}/c/${conversationId}/messages`, getAccessToken),
    enabled: !!conversationId,
  });
}
