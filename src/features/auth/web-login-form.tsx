"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PasswordToggle, authIcons } from "@/features/auth/auth-ui";
import { signInWithEmail, sendPasswordReset } from "@/features/auth/auth-service";
import { WebAuthLayout } from "@/features/auth/web-auth-layout";
import { WebAuthField, WebPrimaryButton } from "@/features/auth/web-auth-fields";
import { loginSchema } from "@/features/onboarding/schemas";
import { resolveAppEntry } from "@/features/auth/route-guards";
import { useTranslation } from "@/lib/i18n/context";
import { fetchCurrentProfile } from "@/services/profile-service";
import { Checkbox } from "@/components/ui/checkbox";

export function WebLoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const { error } = await signInWithEmail(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (rememberMe && typeof window !== "undefined") {
      window.localStorage.setItem("tijar-remember-login", "1");
    }
    const { profile } = await fetchCurrentProfile();
    void navigate({ to: resolveAppEntry(profile, true) });
  }

  async function onForgot() {
    if (!email.includes("@")) {
      toast.error(t("app.login.email"));
      return;
    }
    const { error } = await sendPasswordReset(email);
    if (error) toast.error(error.message);
    else toast.success(t("app.login.resetSent"));
  }

  return (
    <WebAuthLayout
      mode="login"
      title={t("auth.webLoginTitle")}
      subtitle={t("auth.webLoginSubtitle")}
      footer={
        <p className="mt-6 text-center text-sm text-[#5a6578]">
          <Link to="/" className="font-medium text-[#001B3A] underline-offset-2 hover:underline">
            {t("auth.backToHome")}
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <WebAuthField
          id="web-login-email"
          label={t("app.register.email")}
          icon={authIcons.mail}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
        />
        <WebAuthField
          id="web-login-password"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#001B3A]">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
              className="border-[#c5d0db] data-[state=checked]:border-[#00C853] data-[state=checked]:bg-[#00C853]"
            />
            {t("auth.rememberMe")}
          </label>
          <button
            type="button"
            className="text-sm font-semibold text-[#00A896] hover:underline"
            onClick={() => void onForgot()}
          >
            {t("auth.forgotPassword")}
          </button>
        </div>
        <WebPrimaryButton loading={loading} variant="navy">
          {t("auth.logIn")}
          <ArrowRight className="size-4" />
        </WebPrimaryButton>
      </form>
      <p className="mt-6 border-t border-[#eceff3] pt-6 text-center text-sm text-[#5a6578]">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-[#00C853] hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </WebAuthLayout>
  );
}
