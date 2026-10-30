import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordScreen } from "@/features/auth/forgot-password-screen";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot password — TIJAR" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordScreen,
});
