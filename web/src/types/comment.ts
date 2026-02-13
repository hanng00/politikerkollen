export interface Comment {
  id: string;
  contradictionId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  upvotes: number;
  upvotedBy: string[]; // user IDs
  parentId: string | null; // null = top-level, string = reply
}

export interface CommentInput {
  contradictionId: string;
  content: string;
  parentId?: string;
}
