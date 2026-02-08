import { z } from 'zod';

// =============================================================================
// Key Builders
// =============================================================================

export const conversationPK = (conversationId: string) => `CONV#${conversationId}` as const;

export const SK = {
  METADATA: 'METADATA',
  /** Generate message SK for chronological ordering: MSG#{timestamp}#{messageId} */
  MESSAGE: (timestamp: string, messageId: string) => `MSG#${timestamp}#${messageId}` as const,
  /** Prefix for querying all messages */
  MESSAGE_PREFIX: 'MSG#',
} as const;

// =============================================================================
// Conversation Schema
// =============================================================================

export const ConversationSchema = z.object({
  title: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// =============================================================================
// Chat Message Types (for AI SDK UIMessage persistence)
// =============================================================================

/**
 * Schema for validating incoming UIMessage from frontend.
 * Matches AI SDK's UIMessage format.
 */
export const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.any()),
  metadata: z.any().optional(),
  createdAt: z.coerce.date().optional(),
});

export type UIMessageInput = z.infer<typeof UIMessageSchema>;

// =============================================================================
// DynamoDB Item Types
// =============================================================================

export interface ConversationItem extends Conversation {
  PK: string; // CONV#{conversationId}
  SK: typeof SK.METADATA;
}

/**
 * DynamoDB item for storing a single chat message.
 * Each message is stored as a separate item for efficient pagination.
 *
 * We store the full UIMessage as a JSON blob (`messageData`) to:
 * 1. Support future AI SDK fields without schema changes
 * 2. Preserve tool calls, data parts, and complex structures exactly
 * 3. Simplify serialization/deserialization
 */
export interface MessageItem {
  PK: string; // CONV#{conversationId}
  SK: string; // MSG#{timestamp}#{messageId}
  messageId: string; // Extracted for indexing/deduplication
  messageData: string; // Full UIMessage serialized as JSON
  createdAt: string; // ISO timestamp for TTL/auditing
}
