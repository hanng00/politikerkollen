"use client";

import { getPostHogHost, getPostHogKey } from "@/lib/config";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense } from "react";

// Initialize PostHog only once on the client
if (typeof window !== "undefined") {
  posthog.init(getPostHogKey(), {
    api_host: getPostHogHost(),
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    __add_tracing_headers: [window.location.host], // Sends session ID to backend on every request
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}></Suspense>
      {children}
    </PHProvider>
  );
}
