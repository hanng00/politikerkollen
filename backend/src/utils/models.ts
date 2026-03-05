/**
 * Centralized LLM and embedding model configuration.
 *
 * All model identifiers live here. No model strings should be
 * hardcoded in feature code - import from this module instead.
 */

export const models = {
  /** Primary chat model for conversational AI features */
  chat: 'gpt-5.1-codex-mini',

  /** Fast/cheap model for structured generation (HyDE, extraction, etc.) */
  fast: 'gpt-4o-mini',

  /** Embedding model - must match what cognition pipeline uses for indexing */
  embedding: 'text-embedding-3-small',
} as const;

export const embeddingDimensions = 1536;

export type ModelId = typeof models[keyof typeof models];
