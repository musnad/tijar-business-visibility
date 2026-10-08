import { createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "@/features/auth/login-form";
import { RedirectIfAuthed } from "@/features/app/require-auth";

export const Route = createFileRoute("/app/login")({
  component: AppLoginPage,
});

function AppLoginPage() {
  return (
    <RedirectIfAuthed>
      <LoginForm />
    </RedirectIfAuthed>
  );
}
