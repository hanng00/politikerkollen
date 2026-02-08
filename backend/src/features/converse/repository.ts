import { BatchWriteCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { UIMessage } from 'ai';
import { ddb, TABLE_NAME } from '../../utils/ddb';
import { type MessageItem, type ConversationItem, conversationPK, SK } from './types';

/** Generate a UUID for new conversations */
const generateId = (): string => crypto.randomUUID();

/** Get current ISO timestamp */
const now = (): string => new Date().toISOString();

export const repository = {
  /**
   * Create a new conversation.
   * @param title - Optional title for the conversation
   * @param userId - The authenticated user's ID
   * @returns The new conversation ID
   */
  async createConversation(title?: string, userId?: string): Promise<string> {
    const id = generateId();
    const timestamp = now();

    const item: ConversationItem = {
      PK: conversationPK(id),
      SK: SK.METADATA,
      title,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    return id;
  },

  /**
   * Load chat messages for a conversation with optional pagination.
   *
   * Messages are stored as JSON blobs and deserialized on read.
   * This preserves all UIMessage fields including future extensions.
   *
   * @param conversationId - The conversation ID
   * @param options.limit - Max messages to return (default: no limit)
   * @param options.cursor - Last evaluated SK for pagination
   * @param options.fromEnd - If true, return the last N messages instead of first N
   * @returns Messages in chronological order and optional next cursor
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; cursor?: string; fromEnd?: boolean },
  ): Promise<{ messages: UIMessage[]; nextCursor?: string }> {
    // When fromEnd is true, query in reverse order to get the last N messages
    const scanForward = !options?.fromEnd;

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': conversationPK(conversationId),
          ':skPrefix': SK.MESSAGE_PREFIX,
        },
        ScanIndexForward: scanForward,
        ...(options?.limit && { Limit: options.limit }),
        ...(options?.cursor && {
          ExclusiveStartKey: {
            PK: conversationPK(conversationId),
            SK: options.cursor,
          },
        }),
      }),
    );

    const items = (result.Items ?? []) as MessageItem[];

    // Deserialize JSON blobs back to UIMessage
    // Skip items without messageData (handles case where no messages are saved yet)
    let messages: UIMessage[] = items
      .filter((item) => item.messageData != null)
      .map((item) => JSON.parse(item.messageData!) as UIMessage);

    // If we queried in reverse, reverse the result to restore chronological order
    if (options?.fromEnd) {
      messages = messages.reverse();
    }

    const nextCursor = result.LastEvaluatedKey?.SK as string | undefined;

    return { messages, nextCursor };
  },

  /**
   * Save new messages to DynamoDB.
   * Uses BatchWriteItem for efficiency (max 25 items per batch).
   *
   * Each message is serialized as a JSON blob to preserve all fields
   * including any future AI SDK extensions.
   *
   * @param conversationId - The conversation ID
   * @param messages - UIMessages to save
   */
  async saveMessages(conversationId: string, messages: UIMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const pk = conversationPK(conversationId);
    const batchTime = Date.now();

    // Serialize each message as a JSON blob
    // Add 1ms offset per message to ensure chronological ordering within batch
    const items: MessageItem[] = messages.map((msg, index) => {
      const msgTimestamp = new Date(batchTime + index).toISOString();

      return {
        PK: pk,
        SK: SK.MESSAGE(msgTimestamp, msg.id),
        messageId: msg.id,
        messageData: JSON.stringify(msg),
        createdAt: msgTimestamp,
      };
    });

    // DynamoDB BatchWriteItem supports max 25 items per request
    const BATCH_SIZE = 25;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const writeRequests = batch.map((item) => ({
        PutRequest: { Item: item },
      }));

      await ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: writeRequests,
          },
        }),
      );
    }
  },
};
