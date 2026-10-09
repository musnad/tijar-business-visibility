import { createFileRoute } from "@tanstack/react-router";

import { RedirectIfAuthed } from "@/features/app/require-auth";
import { WebLoginForm } from "@/features/auth/web-login-form";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — TIJAR" }, { name: "robots", content: "noindex" }],
  }),
  component: PublicLoginPage,
});

function PublicLoginPage() {
  return (
    <RedirectIfAuthed>
      <WebLoginForm />
    </RedirectIfAuthed>
  );
}
