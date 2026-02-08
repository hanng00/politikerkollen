import { fetchDocument } from "@/lib/riksdag";
import { useQuery } from "@tanstack/react-query";

export function useRiksdagDocument(dokId: string | undefined) {
  return useQuery({
    queryKey: ["riksdag-document", dokId],
    queryFn: () => fetchDocument(dokId!),
    enabled: !!dokId,
  });
}
