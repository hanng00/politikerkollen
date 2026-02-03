import { PostHog } from "posthog-node";

// Server-side PostHog client for LLM tracing
export const posthogClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { 
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    flushAt: 1, // Flush after each event for more reliable tracing
    flushInterval: 0,
  }
);

// Graceful shutdown helper
export async function shutdownPostHog() {
  await posthogClient.shutdown();
}
