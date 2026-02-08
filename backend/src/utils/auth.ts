import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface User {
  userId: string;
  email?: string;
}

// Lazy-initialized verifier
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
      tokenUse: 'id',
    });
  }
  return verifier;
}

/**
 * Verify JWT from Authorization header and extract user.
 */
export async function verifyAuth(authHeader: string | undefined): Promise<User | null> {
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  try {
    const payload = await getVerifier().verify(token);
    return {
      userId: payload.sub,
      email: payload.email as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if invalid.
 */
export async function requireAuth(authHeader: string | undefined): Promise<User> {
  const user = await verifyAuth(authHeader);
  if (!user) throw new Error('Unauthorized');
  return user;
}
