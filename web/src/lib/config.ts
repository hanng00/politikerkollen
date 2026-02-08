export const getChatEndpoint = () => {
  return process.env.NEXT_PUBLIC_CHAT_ENDPOINT!;
};

export const getPostHogKey = () => {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY!;
};

export const getPostHogHost = () => {
  return "/ingest";
};
