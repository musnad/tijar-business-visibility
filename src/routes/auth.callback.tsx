import { createFileRoute } from "@tanstack/react-router";

import { AuthCallbackScreen } from "@/features/auth/auth-callback-screen";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Signing in — TIJAR" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallbackScreen,
});
