import { withCors } from './cors';

export const success = (data: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const created = (data: any) => {
  return {
    statusCode: 201,
    body: JSON.stringify(data),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const badRequest = (error: string) => {
  return {
    statusCode: 400,
    body: JSON.stringify({ error }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const unauthorized = (error?: string) => {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: error ?? 'Unauthorized' }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const forbidden = (error: string) => {
  return {
    statusCode: 403,
    body: JSON.stringify({ error }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const notFound = (error: string) => {
  return {
    statusCode: 404,
    body: JSON.stringify({ error }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const conflict = (error: string) => {
  return {
    statusCode: 409,
    body: JSON.stringify({ error }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

export const tooManyRequests = (error: string, retryAfterSeconds?: number) => {
  const headers: Record<string, string> = withCors({ 'Content-Type': 'application/json' });
  if (retryAfterSeconds !== undefined) {
    headers['Retry-After'] = String(Math.ceil(retryAfterSeconds));
  }
  return {
    statusCode: 429,
    body: JSON.stringify({ error }),
    headers,
  };
};

export const internalServerError = (error: any) => {
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: error.message,
      errorDetails: error.errorDetails,
    }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};

// Generic helper to return an error with a specific HTTP status and payload
export const errorWithStatus = (statusCode: number, errorBody: unknown) => {
  return {
    statusCode,
    body: JSON.stringify(errorBody ?? { error: 'Unknown error' }),
    headers: withCors({ 'Content-Type': 'application/json' }),
  };
};
