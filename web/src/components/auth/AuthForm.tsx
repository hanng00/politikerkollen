"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

type AuthView = "email" | "otp";

export function AuthForm() {
  const { signInWithEmail, confirmOtp, otpFlow } = useAuth();
  const [view, setView] = useState<AuthView>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // signUp = 6-digit confirmation code, signIn = 8-digit OTP
  const otpLength = otpFlow === "signUp" ? 6 : 8;

  const emailMutation = useMutation({
    mutationFn: signInWithEmail,
    onSuccess: (result) => {
      if (result.needsOtp) {
        setView("otp");
      }
    },
  });

  const otpMutation = useMutation({
    mutationFn: confirmOtp,
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    emailMutation.mutate(email);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== otpLength) return;
    otpMutation.mutate(otp);
  };

  // Determine which mutation's state to use based on current view
  const isLoading = view === "email" ? emailMutation.isPending : otpMutation.isPending;
  const error = view === "email" ? emailMutation.error : otpMutation.error;
  const errorMessage = error instanceof Error 
    ? error.message 
    : error 
      ? String(error)
      : null;

  if (view === "otp") {
    return (
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Ange kod</CardTitle>
          <CardDescription>Vi skickade en kod till {email}</CardDescription>
        </CardHeader>

        <form onSubmit={handleOtpSubmit}>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel className="sr-only">Engångskod</FieldLabel>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={otpLength}
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                  >
                    {otpLength === 6 ? (
                      <>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </>
                    ) : (
                      <>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                          <InputOTPSlot index={6} />
                          <InputOTPSlot index={7} />
                        </InputOTPGroup>
                      </>
                    )}
                  </InputOTP>
                </div>
                {errorMessage && <FieldError>{errorMessage}</FieldError>}
              </Field>
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || otp.length < otpLength}
            >
              {isLoading ? "Verifierar..." : "Logga in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setView("email");
                setOtp("");
                otpMutation.reset();
              }}
            >
              Byt e-post
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Logga in</CardTitle>
        <CardDescription>Ange din e-post så skickar vi en kod</CardDescription>
      </CardHeader>

      <form onSubmit={handleEmailSubmit}>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="email">E-post</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="namn@exempel.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
              {errorMessage && <FieldError>{errorMessage}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Skickar..." : "Skicka kod"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
