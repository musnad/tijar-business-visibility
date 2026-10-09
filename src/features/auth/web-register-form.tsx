"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PasswordToggle, authIcons } from "@/features/auth/auth-ui";
import { signUpWithEmail } from "@/features/auth/auth-service";
import { WebAuthLayout } from "@/features/auth/web-auth-layout";
import { WebAuthField, WebAuthSelect, WebPrimaryButton } from "@/features/auth/web-auth-fields";
import { registerSchema } from "@/features/onboarding/schemas";
import { useTranslation } from "@/lib/i18n/context";
import { Checkbox } from "@/components/ui/checkbox";

const LOCATION_OPTIONS = [
  "Kano, Nigeria",
  "Lagos, Nigeria",
  "Abuja, Nigeria",
  "Kaduna, Nigeria",
  "Port Harcourt, Nigeria",
  "Ibadan, Nigeria",
  "Other",
];

export function WebRegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({
      fullName,
      phone,
      email,
      password,
      location,
      agreeTerms,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data, error } = await signUpWithEmail({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      location: parsed.data.location,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "tijar-onboarding-prefill",
        JSON.stringify({
          businessName: parsed.data.fullName,
          location: parsed.data.location,
        }),
      );
    }
    if (data.session) {
      void navigate({ to: "/app/onboarding" });
      return;
    }
    toast.message(t("app.register.checkEmail"));
    void navigate({ to: "/login" });
  }

  return (
    <WebAuthLayout
      mode="register"
      title={t("auth.webRegisterTitle")}
      subtitle={t("auth.webRegisterSubtitle")}
      footer={
        <p className="mt-6 text-center text-sm text-[#5a6578]">
          <Link to="/" className="font-medium text-[#001B3A] underline-offset-2 hover:underline">
            {t("auth.backToHome")}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <WebAuthField
          id="web-reg-name"
          label={t("app.register.fullName")}
          icon={authIcons.person}
          value={fullName}
          onChange={setFullName}
          placeholder={t("auth.fullNamePlaceholder")}
          autoComplete="name"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <WebAuthField
            id="web-reg-phone"
            label={t("auth.phone")}
            icon={authIcons.phone}
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder={t("auth.phonePlaceholder")}
            autoComplete="tel"
          />
          <WebAuthField
            id="web-reg-email"
            label={t("app.register.email")}
            icon={authIcons.mail}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            autoComplete="email"
          />
        </div>
        <WebAuthField
          id="web-reg-password"
          label={t("app.register.password")}
          icon={authIcons.lock}
          type={passwordVisible ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder={t("auth.passwordCreatePlaceholder")}
          autoComplete="new-password"
          trailing={
            <PasswordToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />
          }
        />
        <WebAuthSelect
          id="web-reg-location"
          label={t("auth.location")}
          icon={authIcons.map}
          value={location}
          onChange={setLocation}
          placeholder={t("auth.locationPlaceholder")}
          options={LOCATION_OPTIONS.map((l) => ({ value: l, label: l }))}
        />
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-[#5a6578]">
          <Checkbox
            checked={agreeTerms}
            onCheckedChange={(v) => setAgreeTerms(v === true)}
            className="mt-0.5 border-[#c5d0db] data-[state=checked]:border-[#00C853] data-[state=checked]:bg-[#00C853]"
          />
          <span>
            {t("auth.agreeTerms")}{" "}
            <Link to="/terms" className="font-semibold text-[#00A896] hover:underline">
              {t("auth.terms")}
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link to="/privacy" className="font-semibold text-[#00A896] hover:underline">
              {t("auth.privacy")}
            </Link>
          </span>
        </label>
        <WebPrimaryButton loading={loading}>{t("auth.createAccount")}</WebPrimaryButton>
      </form>
      <p className="mt-6 border-t border-[#eceff3] pt-6 text-center text-sm text-[#5a6578]">
        {t("auth.hasAccount")}{" "}
        <Link to="/login" className="font-semibold text-[#00C853] hover:underline">
          {t("auth.logIn")}
        </Link>
      </p>
    </WebAuthLayout>
  );
}
