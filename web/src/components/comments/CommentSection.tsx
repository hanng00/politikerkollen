"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronUp, MessageSquare, Reply, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Comment } from "@/types";

interface Props {
  contradictionId: string;
}

function CommentItem({
  comment,
  replies,
  onReply,
  onUpvote,
  hasUpvoted,
  isAuthenticated,
  depth = 0,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: (parentId: string) => void;
  onUpvote: (commentId: string) => void;
  hasUpvoted: (commentId: string) => boolean;
  isAuthenticated: boolean;
  depth?: number;
}) {
  const upvoted = hasUpvoted(comment.id);
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: sv,
  });

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 pl-3 border-l")}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.userName}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
        <p className="text-sm">{comment.content}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpvote(comment.id)}
            disabled={!isAuthenticated}
            className={cn(
              "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-muted transition-colors",
              upvoted ? "text-primary" : "text-muted-foreground"
            )}
          >
            <ChevronUp className={cn("size-3.5", upvoted && "fill-current")} />
            {comment.upvotes > 0 && <span>{comment.upvotes}</span>}
          </button>
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              disabled={!isAuthenticated}
              className="flex items-center gap-1 text-xs text-muted-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
            >
              <Reply className="size-3" />
              Svara
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3 pt-1">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onUpvote={onUpvote}
              hasUpvoted={hasUpvoted}
              isAuthenticated={isAuthenticated}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ contradictionId }: Props) {
  const { user, isAuthenticated } = useAuth();
  const {
    comments,
    getReplies,
    addComment,
    toggleUpvote,
    hasUpvoted,
    totalCount,
  } = useComments(contradictionId, user?.userId ?? null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment({ contradictionId, content: newComment.trim() });
    setNewComment("");
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addComment({
      contradictionId,
      content: replyContent.trim(),
      parentId,
    });
    setReplyContent("");
    setReplyingTo(null);
  };

  return (
    <div className="border-t pt-3 mt-3">
      {/* Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="size-3.5" />
        {totalCount} {totalCount === 1 ? "kommentar" : "kommentarer"}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Add comment */}
          {isAuthenticated ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Lägg till en kommentar..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!newComment.trim()}
                >
                  Kommentera
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm">
              <LogIn className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                <a href="/c" className="text-primary hover:underline">
                  Logga in
                </a>{" "}
                för att kommentera
              </span>
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  replies={getReplies(comment.id)}
                  onReply={(parentId) => setReplyingTo(parentId)}
                  onUpvote={toggleUpvote}
                  hasUpvoted={hasUpvoted}
                  isAuthenticated={isAuthenticated}
                />

                {/* Reply input */}
                {replyingTo === comment.id && isAuthenticated && (
                  <div className="ml-6 pl-3 border-l mt-2 space-y-2">
                    <Textarea
                      placeholder={`Svara ${comment.userName}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[50px] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                      >
                        Avbryt
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim()}
                      >
                        Svara
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga kommentarer än. Bli först!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
