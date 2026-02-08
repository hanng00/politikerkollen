import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { repository } from './repository';

/**
 * GET /c/{id}/messages - Get messages for a conversation.
 * Auth handled by API Gateway Cognito authorizer.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing conversation ID' }) };
    }

    // Load messages (last 100 by default)
    const { messages } = await repository.getMessages(conversationId, {
      limit: 100,
      fromEnd: true,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ messages }),
    };
  } catch (error) {
    console.error('GetConversationMessages error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
