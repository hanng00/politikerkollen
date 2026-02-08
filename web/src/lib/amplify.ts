import { Amplify } from 'aws-amplify';

/**
 * Amplify configuration for Cognito authentication.
 * 
 * These values come from the SAM stack outputs after deployment.
 * For local development, set these in .env.local:
 * 
 * NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_xxxxx
 * NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
 * NEXT_PUBLIC_COGNITO_REGION=eu-north-1
 */
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
      },
    },
  },
};

let isConfigured = false;

/**
 * Initialize Amplify with Cognito configuration.
 * Call this once at app startup. Safe to call multiple times.
 */
export function configureAmplify() {
  if (isConfigured) return;
  Amplify.configure(amplifyConfig, { ssr: true });
  isConfigured = true;
}
