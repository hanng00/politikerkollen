import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { repository } from './repository';

const RequestBody = z.object({
  title: z.string().optional(),
});

/**
 * POST /c - Create a new conversation.
 * Auth handled by API Gateway Cognito authorizer.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const body = RequestBody.parse(JSON.parse(event.body ?? '{}'));
    const id = await repository.createConversation(body.title, userId);

    return { statusCode: 200, headers, body: JSON.stringify({ id }) };
  } catch (error) {
    console.error('PostConversation error:', error);

    if (error instanceof z.ZodError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
