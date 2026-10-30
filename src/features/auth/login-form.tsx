"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  AuthCard,
  AuthField,
  AuthOrDivider,
  AuthScreen,
  GoogleAuthButton,
  GradientLoginButton,
  LoginTopHeader,
  PasswordToggle,
  RememberForgotRow,
  WelcomeBackHeading,
  authIcons,
} from "@/features/auth/auth-ui";
import { signInWithEmail, signInWithGoogle } from "@/features/auth/auth-service";
import { loginSchema } from "@/features/onboarding/schemas";
import { enterAppAfterAuth } from "@/features/auth/route-guards";
import { useTranslation } from "@/lib/i18n/context";

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.includes("@") ? email.trim() : "";
    if (!normalizedEmail) {
      toast.error(t("auth.phoneLoginSoon"));
      return;
    }
    const parsed = loginSchema.safeParse({ email: normalizedEmail, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data, error } = await signInWithEmail(parsed.data.email, parsed.data.password);
    if (error || !data.session) {
      setLoading(false);
      toast.error(error?.message ?? "Sign-in did not complete. Try again.");
      return;
    }
    if (rememberMe && typeof window !== "undefined") {
      window.localStorage.setItem("tijar-remember-login", "1");
    }
    await enterAppAfterAuth();
  }

  async function onGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error(error.message || t("auth.googleFailed"));
    }
  }

  return (
    <AuthScreen>
      <LoginTopHeader />
      <WelcomeBackHeading />
      <form onSubmit={onSubmit}>
        <AuthCard className="space-y-4">
          <GoogleAuthButton loading={googleLoading} onClick={() => void onGoogle()} />
          <AuthOrDivider />
          <AuthField
            id="login-email"
            label={t("auth.emailOrPhone")}
            icon={authIcons.mail}
            value={email}
            onChange={setEmail}
            placeholder={t("auth.emailOrPhonePlaceholder")}
            autoComplete="username"
          />
          <AuthField
            id="login-password"
            label={t("auth.password")}
            icon={authIcons.lock}
            type={passwordVisible ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete="current-password"
            trailing={
              <PasswordToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />
            }
          />
          <RememberForgotRow
            remember={rememberMe}
            onRemember={setRememberMe}
            onForgot={() => void navigate({ to: "/forgot-password" })}
          />
          <GradientLoginButton loading={loading}>{t("auth.logIn")}</GradientLoginButton>
        </AuthCard>
      </form>
      <p className="mt-6 text-center text-sm text-[#5a6578]">
        {t("auth.noAccount")}{" "}
        <Link to="/app/register" className="font-semibold text-[#1B8A52] hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthScreen>
  );
}
