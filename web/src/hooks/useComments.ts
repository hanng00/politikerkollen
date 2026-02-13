import { useState, useCallback, useMemo } from "react";
import type { Comment, CommentInput } from "@/types";

// Mock initial comments - replace with API later
const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    contradictionId: "contra-1",
    userId: "user-1",
    userName: "Erik L",
    content: "Otroligt att detta inte uppmärksammats mer i media. Tack för att ni gräver fram detta.",
    createdAt: "2026-02-10T14:32:00Z",
    upvotes: 24,
    upvotedBy: [],
    parentId: null,
  },
  {
    id: "c2",
    contradictionId: "contra-1",
    userId: "user-2",
    userName: "Maria S",
    content: "Dock värt att notera att det var en budgetförhandling där S fick igenom annat i utbyte.",
    createdAt: "2026-02-10T15:45:00Z",
    upvotes: 18,
    upvotedBy: [],
    parentId: null,
  },
  {
    id: "c3",
    contradictionId: "contra-1",
    userId: "user-3",
    userName: "Johan K",
    content: "Källa på det? Har inte sett något om det.",
    createdAt: "2026-02-10T16:02:00Z",
    upvotes: 5,
    upvotedBy: [],
    parentId: "c2",
  },
];

export function useComments(contradictionId: string, currentUserId: string | null) {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);

  const filteredComments = useMemo(
    () => comments.filter((c) => c.contradictionId === contradictionId),
    [comments, contradictionId]
  );

  const topLevelComments = useMemo(
    () => filteredComments.filter((c) => c.parentId === null),
    [filteredComments]
  );

  const getReplies = useCallback(
    (parentId: string) => filteredComments.filter((c) => c.parentId === parentId),
    [filteredComments]
  );

  const addComment = useCallback(
    (input: CommentInput) => {
      if (!currentUserId) return;

      const newComment: Comment = {
        id: `c-${Date.now()}`,
        contradictionId: input.contradictionId,
        userId: currentUserId,
        userName: "Du", // Would come from auth
        content: input.content,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        upvotedBy: [],
        parentId: input.parentId ?? null,
      };

      setComments((prev) => [newComment, ...prev]);
    },
    [currentUserId]
  );

  const toggleUpvote = useCallback(
    (commentId: string) => {
      if (!currentUserId) return;

      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;

          const hasUpvoted = c.upvotedBy.includes(currentUserId);
          return {
            ...c,
            upvotes: hasUpvoted ? c.upvotes - 1 : c.upvotes + 1,
            upvotedBy: hasUpvoted
              ? c.upvotedBy.filter((id) => id !== currentUserId)
              : [...c.upvotedBy, currentUserId],
          };
        })
      );
    },
    [currentUserId]
  );

  const hasUpvoted = useCallback(
    (commentId: string) => {
      if (!currentUserId) return false;
      const comment = comments.find((c) => c.id === commentId);
      return comment?.upvotedBy.includes(currentUserId) ?? false;
    },
    [comments, currentUserId]
  );

  return {
    comments: topLevelComments,
    getReplies,
    addComment,
    toggleUpvote,
    hasUpvoted,
    totalCount: filteredComments.length,
  };
}
