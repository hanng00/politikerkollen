import { z } from "zod";
import { fetchDocument } from "@/lib/riksdag";

export const fetchRiksdagDocumentTool = {
  description:
    "Fetch the full text content of a Riksdag document by its ID (e.g., HD023623). Use this when users want to read or analyze a specific document.",
  inputSchema: z.object({
    dok_id: z
      .string()
      .describe("The document ID, e.g., 'HD023623' or 'GZ10394'"),
  }),
  execute: async ({ dok_id }: { dok_id: string }) => {
    const result = await fetchDocument(dok_id);
    if (!result.success) {
      return result;
    }

    // Truncate very long documents for the AI context
    const maxLength = 15000;
    const truncatedContent =
      result.content && result.content.length > maxLength
        ? result.content.slice(0, maxLength) +
          "\n\n[... dokumentet är trunkerat, det finns mer text ...]"
        : result.content;

    return {
      ...result,
      content: truncatedContent,
    };
  },
};
