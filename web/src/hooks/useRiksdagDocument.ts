import { useQuery } from "@tanstack/react-query";
import type { FetchDocumentResult } from "@/lib/riksdag";

async function fetchRiksdagDocument(dokId: string): Promise<FetchDocumentResult> {
  const response = await fetch(`/api/riksdag/${dokId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch document");
  }
  
  return response.json();
}

export function useRiksdagDocument(dokId: string | undefined) {
  return useQuery({
    queryKey: ["riksdag-document", dokId],
    queryFn: () => fetchRiksdagDocument(dokId!),
    enabled: !!dokId,
  });
}
