"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronUp, LogIn, MessageSquare, Reply, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useComments } from "@/hooks/useComments";

interface CommentSectionProps {
  contradictionId: string;
}

function CommentInput({
  onSubmit,
  placeholder = "Lägg till en kommentar...",
  autoFocus = false,
  compact = false,
}: {
  onSubmit: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "resize-none",
          compact ? "min-h-[60px]" : "min-h-[80px]"
        )}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground hidden sm:block">
          Cmd/Ctrl + Enter för att skicka
        </p>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="gap-2"
        >
          <Send className="size-4" />
          Kommentera
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  onReply,
  onUpvote,
  hasUpvoted,
  isAuthenticated,
}: {
  comment: {
    id: string;
    userName: string;
    content: string;
    createdAt: string;
    upvotes: number;
  };
  replies: typeof comment[];
  onReply: (parentId: string, content: string) => void;
  onUpvote: (commentId: string) => void;
  hasUpvoted: boolean;
  isAuthenticated: boolean;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: sv,
  });

  const initials = comment.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleReply = (content: string) => {
    onReply(comment.id, content);
    setShowReplyInput(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Avatar size="sm">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{comment.userName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">{timeAgo}</span>
          </div>
          <p className="text-sm leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpvote(comment.id)}
              disabled={!isAuthenticated}
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors",
                hasUpvoted
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ChevronUp className={cn("size-4", hasUpvoted && "fill-current")} />
              {comment.upvotes > 0 && <span>{comment.upvotes}</span>}
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md hover:text-foreground hover:bg-muted transition-colors"
              >
                <Reply className="size-3.5" />
                Svara
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="pt-2">
              <CommentInput
                onSubmit={handleReply}
                placeholder={`Svara ${comment.userName}...`}
                autoFocus
                compact
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-10 pl-4 border-l-2 border-muted space-y-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onUpvote={onUpvote}
              hasUpvoted={false}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ contradictionId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const {
    comments,
    getReplies,
    addComment,
    toggleUpvote,
    hasUpvoted,
    totalCount,
  } = useComments(contradictionId, user?.userId ?? null);

  const handleAddComment = (content: string) => {
    addComment({ contradictionId, content });
  };

  const handleReply = (parentId: string, content: string) => {
    addComment({ contradictionId, content, parentId });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="size-5" />
          Kommentarer
          {totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({totalCount})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add comment */}
        {isAuthenticated ? (
          <CommentInput onSubmit={handleAddComment} />
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-dashed">
            <LogIn className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <a href="/c" className="text-primary hover:underline font-medium">
                Logga in
              </a>{" "}
              för att kommentera och delta i diskussionen
            </p>
          </div>
        )}

        {/* Comments list */}
        {comments.length > 0 ? (
          <div className="space-y-6 pt-2">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={getReplies(comment.id)}
                onReply={handleReply}
                onUpvote={toggleUpvote}
                hasUpvoted={hasUpvoted(comment.id)}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="size-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Inga kommentarer än. Bli först med att kommentera!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
