import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordScreen } from "@/features/auth/reset-password-screen";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "New password — TIJAR" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordScreen,
});
