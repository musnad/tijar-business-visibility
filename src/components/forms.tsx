"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/context";

type Errors = Record<string, string | undefined>;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function WaitlistForm() {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);

  const waitlistSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, t("forms.contact.errors.name")).max(100),
        phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,24}$/, t("forms.contact.errors.email")),
        businessName: z.string().trim().min(2, t("forms.contact.errors.message")).max(120),
        businessType: z.string().trim().min(2, t("forms.contact.errors.message")),
        city: z.string().trim().min(2, t("forms.contact.errors.message")).max(80),
        language: z.string().trim().min(2, t("forms.contact.errors.message")),
      }),
    [t],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = waitlistSchema.safeParse(Object.fromEntries(form));
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setComplete(true);
  }

  if (complete) {
    return (
      <div className="rounded-[1.25rem] border border-border bg-card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h2 className="mt-5 text-3xl font-extrabold">{t("forms.contact.successTitle")}</h2>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">
          {t("forms.contact.successCopy")}
        </p>
      </div>
    );
  }

  const fields = [
    ["fullName", t("forms.contact.name"), "text", "Aisha Bello"],
    ["phone", t("forms.contact.email"), "tel", "+234 800 000 0000"],
    ["businessName", t("forms.contact.name"), "text", "Aisha Foods"],
    ["city", t("forms.contact.name"), "text", "Kano"],
  ] as const;

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.25rem] border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([id, label, type, placeholder]) => (
          <Field key={id} id={id} label={label} error={errors[id]}>
            <Input
              id={id}
              name={id}
              type={type}
              placeholder={placeholder}
              className="h-12"
              aria-invalid={Boolean(errors[id])}
              aria-describedby={errors[id] ? `${id}-error` : undefined}
            />
          </Field>
        ))}
      </div>
      <Button type="submit" size="lg" className="mt-7 w-full">
        {t("forms.contact.submit")}
      </Button>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
        {t("forms.contact.disclaimer")}
      </p>
    </form>
  );
}

export function ContactForm() {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);

  const contactSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t("forms.contact.errors.name")).max(100),
        email: z.string().trim().email(t("forms.contact.errors.email")).max(255),
        message: z.string().trim().min(10, t("forms.contact.errors.message")).max(1000),
      }),
    [t],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = contactSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setComplete(true);
  }

  if (complete) {
    return (
      <div role="status" className="rounded-[1.25rem] border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-11 text-primary" />
        <h2 className="mt-4 text-2xl font-extrabold">{t("forms.contact.successTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("forms.contact.successCopy")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-5 rounded-[1.25rem] border border-border bg-card p-6 sm:p-8"
    >
      <Field id="name" label={t("forms.contact.name")} error={errors.name}>
        <Input
          id="name"
          name="name"
          className="h-12"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </Field>
      <Field id="email" label={t("forms.contact.email")} error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          className="h-12"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </Field>
      <Field id="message" label={t("forms.contact.message")} error={errors.message}>
        <Textarea
          id="message"
          name="message"
          className="min-h-36"
          maxLength={1000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
      </Field>
      <Button type="submit" size="lg" className="h-12">
        {t("forms.contact.submit")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("forms.contact.disclaimer")}</p>
    </form>
  );
}
