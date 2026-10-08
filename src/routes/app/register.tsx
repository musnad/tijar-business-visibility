import { createFileRoute } from "@tanstack/react-router";

import { RegisterForm } from "@/features/auth/register-form";
import { RedirectIfAuthed } from "@/features/app/require-auth";

export const Route = createFileRoute("/app/register")({
  component: AppRegisterPage,
});

function AppRegisterPage() {
  return (
    <RedirectIfAuthed>
      <RegisterForm />
    </RedirectIfAuthed>
  );
}
