"use client";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useComments } from "@/hooks/useComments";
import type { Contradiction, Politician, Comment } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Flame,
  LogIn,
  MessageSquare,
  Quote,
  Reply,
  Share2,
  Vote,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { ShareDialog } from "./ShareDialog";

interface ContradictionCardProps {
  contradiction: Contradiction;
  politician: Pick<
    Politician,
    "firstName" | "lastName" | "imageUrl" | "party" | "constituency"
  >;
  featured?: boolean;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function ActionPill({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground transition-colors",
        onClick && "hover:bg-muted hover:text-foreground cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
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

export function ContradictionCard({
  contradiction,
  politician,
  featured = false,
}: ContradictionCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const fullName = `${politician.firstName} ${politician.lastName}`;
  const { user, isAuthenticated } = useAuth();
  const {
    comments,
    getReplies,
    addComment,
    toggleUpvote,
    hasUpvoted,
    totalCount,
  } = useComments(contradiction.id, user?.userId ?? null);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment({ contradictionId: contradiction.id, content: newComment.trim() });
    setNewComment("");
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addComment({
      contradictionId: contradiction.id,
      content: replyContent.trim(),
      parentId,
    });
    setReplyContent("");
    setReplyingTo(null);
  };

  return (
    <>
      <Card
        className={cn("overflow-hidden", featured && "border-destructive/30")}
      >
        {/* Header with politician info - prominent display */}
        <CardHeader className="pb-3 bg-linear-to-r from-destructive/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PoliticianAvatar politician={politician} />
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  {fullName}
                  {featured && (
                    <Badge variant="destructive" className="text-[9px] h-4">
                      <Flame className="size-2.5 mr-0.5" />
                      Trending
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {politician.party.name} · {politician.constituency}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {contradiction.topic.name}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* The contradiction */}
          <div className="grid gap-3">
            {/* Said */}
            <div className="relative pl-4 border-l-2 border-warning">
              <div className="absolute -left-1.5 top-0 size-3 rounded-full bg-warning flex items-center justify-center">
                <Quote className="size-1.5 text-warning-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground mb-1">
                SA — {contradiction.said.date}
              </p>
              <p className="text-sm italic">
                &quot;{contradiction.said.content}&quot;
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {contradiction.said.source}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-2 pl-4">
              <div className="flex-1 h-px bg-linear-to-r from-warning/50 to-destructive/50" />
              <span className="text-[10px] text-muted-foreground">
                {contradiction.daysApart} dagar senare
              </span>
              <div className="flex-1 h-px bg-linear-to-r from-destructive/50 to-destructive/20" />
            </div>

            {/* Done */}
            <div className="relative pl-4 border-l-2 border-destructive">
              <div className="absolute -left-1.5 top-0 size-3 rounded-full bg-destructive flex items-center justify-center">
                <Vote className="size-1.5 text-destructive-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground mb-1">
                GJORDE — {contradiction.done.date}
              </p>
              <p className="text-sm font-medium">
                {contradiction.done.content}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {contradiction.done.source}
              </p>
            </div>
          </div>

          {/* Reddit-style action bar */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {/* Upvote/Downvote pill */}
            <ActionPill className="gap-0.5 px-2">
              <button
                className="p-0.5 hover:text-primary transition-colors"
                aria-label="Rösta upp"
              >
                <ChevronUp className="size-4" />
              </button>
              <span className="font-medium min-w-[2ch] text-center">
                {formatCount(contradiction.viewCount)}
              </span>
              <button
                className="p-0.5 hover:text-destructive transition-colors"
                aria-label="Rösta ner"
              >
                <ChevronDown className="size-4" />
              </button>
            </ActionPill>

            {/* Comments pill */}
            <ActionPill onClick={() => setShowComments(!showComments)}>
              <MessageSquare className="size-4" />
              <span>{formatCount(totalCount)}</span>
            </ActionPill>

            {/* Views pill */}
            <ActionPill>
              <Eye className="size-4" />
              <span>{formatCount(contradiction.viewCount)}</span>
            </ActionPill>

            {/* Share pill */}
            <ActionPill onClick={() => setShowShareDialog(true)}>
              <Share2 className="size-4" />
              <span>Dela</span>
            </ActionPill>
          </div>

          {/* Expandable comments section */}
          {showComments && (
            <div className="pt-3 border-t space-y-4">
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
        </CardContent>
      </Card>

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        contradiction={contradiction}
        politician={politician}
      />
    </>
  );
}
