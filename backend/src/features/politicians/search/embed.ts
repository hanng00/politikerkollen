/**
 * Embed query text using OpenAI text-embedding-3-small
 */

import { getOpenAIKey } from '../../../utils/secrets';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding for a query string
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = getOpenAIKey();

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
  }

  const data = await response.json() as EmbeddingResponse;
  return data.data[0].embedding;
}
