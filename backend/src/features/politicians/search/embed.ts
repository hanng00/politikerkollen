/**
 * Query embedding with HyDE (Hypothetical Document Embeddings).
 *
 * Short queries ("sänka skatten") produce embeddings far from full-document
 * embeddings in vector space. HyDE bridges this gap by first asking an LLM
 * to generate a realistic document, then embedding that instead.
 */

import { getOpenAIKey } from '../../../utils/secrets';
import { models, embeddingDimensions } from '../../../utils/models';

const HYDE_MIN_QUERY_LENGTH = 80;

const HYDE_SYSTEM_PROMPT = `Givet en kort politisk fråga, skriv en realistisk svensk riksdagsmotion (200-300 ord) i exakt detta format. Skriv BARA motionstexten.

Exempelformat:
Motion till riksdagen av [namn] ([parti])
[Rubrik]
Förslag till riksdagsbeslut
Riksdagen ställer sig bakom det som anförs i motionen om [förslag] och tillkännager detta för regeringen.
Motivering
[Motiveringstext som förklarar bakgrund, problemställning och varför förslaget behövs. Använd formellt riksdagsspråk med konkreta argument.]`;

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * HyDE: expand a short query into a hypothetical riksdag motion summary.
 * Falls back to the raw query on any failure.
 */
async function expandQueryWithHyDE(userQuery: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: models.fast,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: 'system', content: HYDE_SYSTEM_PROMPT },
        { role: 'user', content: userQuery },
      ],
    }),
  });

  if (!response.ok) {
    console.warn('[HyDE] LLM expansion failed:', response.status, '- falling back to raw query');
    return userQuery;
  }

  const data = (await response.json()) as ChatResponse;
  const expanded = data.choices[0]?.message?.content?.trim();

  if (!expanded) return userQuery;

  console.log('[HyDE] Expanded query to', expanded.length, 'chars');
  return expanded;
}

async function embed(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: models.embedding,
      input: text,
      dimensions: embeddingDimensions,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  return data.data[0]!.embedding;
}

/**
 * Generate an embedding for a search query.
 * Short queries are first expanded via HyDE for better retrieval.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = getOpenAIKey();

  const input =
    text.length < HYDE_MIN_QUERY_LENGTH
      ? await expandQueryWithHyDE(text, apiKey)
      : text;

  return embed(input, apiKey);
}
