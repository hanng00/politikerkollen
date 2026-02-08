import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Lambda response stream type for awslambda.streamifyResponse handlers.
 * This is the stream passed to the handler that supports setContentType and write.
 */
export type LambdaResponseStream = Writable & {
  setContentType(contentType: string): void;
};

/**
 * Pipes a standard Response object to Lambda's streaming response.
 *
 * This utility bridges the AI SDK's `toUIMessageStreamResponse()` (which returns
 * a standard Web Response) with AWS Lambda's streaming response API.
 *
 * @example
 * ```ts
 * const result = streamText({ model, messages });
 * const response = result.toUIMessageStreamResponse();
 * await pipeResponseToLambdaStream(response, responseStream);
 * ```
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
 */
export async function pipeResponseToLambdaStream(
  response: Response,
  responseStream: LambdaResponseStream,
): Promise<void> {
  const httpResponseMetadata = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  const wrappedStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);

  if (response.body) {
    const nodeReadable = Readable.fromWeb(response.body as import('stream/web').ReadableStream);
    await pipeline(nodeReadable, wrappedStream);
  } else {
    wrappedStream.end();
  }
}

/**
 * Writes an error response to Lambda's streaming response.
 *
 * @example
 * ```ts
 * try {
 *   // ... streaming logic
 * } catch (error) {
 *   writeErrorToLambdaStream(error, responseStream);
 * }
 * ```
 */
export function writeErrorToLambdaStream(error: unknown, responseStream: LambdaResponseStream, statusCode = 500): void {
  const httpResponseMetadata = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const wrappedStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);
  wrappedStream.write(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }),
  );
  wrappedStream.end();
}
