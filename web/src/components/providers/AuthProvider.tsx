"use client";

import { createContext, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  signIn,
  signUp,
  signOut,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  autoSignIn,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify";
import posthog from "posthog-js";

configureAmplify();

export interface AuthUser {
  userId: string;
  email?: string;
  username: string;
}

type OtpFlow = "signUp" | "signIn";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  otpFlow: OtpFlow; // "signUp" = 6-digit, "signIn" = 8-digit
  signInWithEmail: (email: string) => Promise<{ needsOtp: boolean }>;
  confirmOtp: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_QUERY_KEY = ["auth", "user"];

// Helper to check error type (Amplify errors have name or __type)
function isErrorType(err: unknown, type: string): boolean {
  const e = err as { name?: string; __type?: string; message?: string };
  return e.name === type || e.__type === type || e.message?.includes(type) === true;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();
    return {
      userId: currentUser.userId,
      username: currentUser.username,
      email: session.tokens?.idToken?.payload?.email as string | undefined,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Track OTP flow: "signUp" = 6-digit confirmation, "signIn" = 8-digit OTP
  const [otpFlow, setOtpFlow] = useState<OtpFlow>("signIn");
  const emailRef = useRef("");

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  // Identify user to PostHog when auth state changes
  useEffect(() => {
    if (user) {
      posthog.identify(user.userId, {
        email: user.email,
        username: user.username,
      });
    } else if (!isLoading) {
      posthog.reset();
    }
  }, [user, isLoading]);

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn" || payload.event === "tokenRefresh") {
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      } else if (payload.event === "signedOut") {
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Helper to handle sign-in result and select EMAIL_OTP if needed
  const handleSignInResult = async (
    result: Awaited<ReturnType<typeof signIn>>
  ): Promise<{ needsOtp: boolean }> => {
    if (result.isSignedIn) {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      return { needsOtp: false };
    }

    // If Cognito asks us to select a challenge, choose EMAIL_OTP
    if (result.nextStep.signInStep === "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION") {
      const selectResult = await confirmSignIn({ challengeResponse: "EMAIL_OTP" });
      return handleSignInResult(selectResult);
    }

    // OTP was sent for sign-in
    if (
      result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
      result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_SMS_CODE"
    ) {
      setOtpFlow("signIn");
      return { needsOtp: true };
    }

    return { needsOtp: false };
  };

  const signInWithEmail = async (email: string): Promise<{ needsOtp: boolean }> => {
    emailRef.current = email;

    // Step 1: Try to sign in
    try {
      const result = await signIn({
        username: email,
        options: { authFlowType: "USER_AUTH" },
      });

      return await handleSignInResult(result);
    } catch (err) {
      // Step 2: Handle user not found - create account
      if (isErrorType(err, "UserNotFoundException")) {
        const signUpResult = await signUp({
          username: email,
          password: crypto.randomUUID(), // Required by Cognito, never used
          options: { userAttributes: { email }, autoSignIn: true },
        });

        if (signUpResult.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setOtpFlow("signUp");
          return { needsOtp: true };
        }

        // Unlikely: user was auto-confirmed, try sign-in
        if (signUpResult.isSignUpComplete) {
          const result = await signIn({
            username: email,
            options: { authFlowType: "USER_AUTH" },
          });
          return await handleSignInResult(result);
        }

        return { needsOtp: false };
      }

      // Step 3: Handle unconfirmed user - resend code
      if (isErrorType(err, "UserNotConfirmedException")) {
        await resendSignUpCode({ username: email });
        setOtpFlow("signUp");
        return { needsOtp: true };
      }

      throw err;
    }
  };

  const confirmOtp = async (code: string): Promise<void> => {
    const email = emailRef.current;
    if (!email) throw new Error("No email. Please start again.");

    if (otpFlow === "signUp") {
      // Confirm the account
      await confirmSignUp({ username: email, confirmationCode: code });

      // Try auto sign-in
      try {
        const autoResult = await autoSignIn();
        if (autoResult.isSignedIn) {
          await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
          return;
        }
      } catch {
        // Auto sign-in failed, continue to manual sign-in
      }

      // Manual sign-in after confirmation
      const signInResult = await signIn({
        username: email,
        options: { authFlowType: "USER_AUTH" },
      });

      const finalResult = await handleSignInResult(signInResult);
      if (!finalResult.needsOtp) {
        return; // Signed in successfully
      }

      // Need another OTP for sign-in
      throw new Error("Konto bekräftat! Kolla din e-post för en ny kod.");
    }

    // Sign-in flow
    const result = await confirmSignIn({ challengeResponse: code });
    if (!result.isSignedIn) {
      throw new Error("Fel kod. Försök igen.");
    }
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
  };

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        otpFlow,
        signInWithEmail,
        confirmOtp,
        signOut: handleSignOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
