import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../../utils/ddb';
import { conversationPK, SK, type ConversationItem } from './types';

/**
 * GET /c - List conversations for the authenticated user.
 * Auth handled by API Gateway Cognito authorizer.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Scan for all conversation metadata items for this user
    // Note: For better performance with many conversations, consider adding a GSI on userId
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :sk AND userId = :userId',
        ExpressionAttributeValues: {
          ':sk': SK.METADATA,
          ':userId': userId,
        },
      }),
    );

    const conversations = (result.Items ?? []) as ConversationItem[];

    // Sort by updatedAt descending (most recent first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    // Extract conversation ID from PK (CONV#{id})
    const formatted = conversations.map((conv) => ({
      id: conv.PK.replace(/^CONV#/, ''),
      title: conv.title || 'New Conversation',
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversations: formatted }),
    };
  } catch (error) {
    console.error('GetConversations error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
