import { createFileRoute, Link } from "@tanstack/react-router";

import { RedirectIfAuthed } from "@/features/app/require-auth";
import { LoginForm } from "@/features/auth/login-form";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — TIJAR" }, { name: "robots", content: "noindex" }],
  }),
  component: PublicLoginPage,
});

function PublicLoginPage() {
  const { t } = useTranslation();

  return (
    <RedirectIfAuthed>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center px-4 py-10">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t("auth.publicLoginLead")}{" "}
          <Link to="/app/register" className="font-semibold text-primary underline-offset-2 hover:underline">
            {t("common.getStarted")}
          </Link>
        </p>
        <LoginForm />
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline-offset-2 hover:underline">
            {t("auth.backToHome")}
          </Link>
        </p>
      </div>
    </RedirectIfAuthed>
  );
}
