import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { RequireAuth } from "@/features/app/require-auth";
import { ModerationScreen } from "@/features/discover/moderation-screen";

export const Route = createFileRoute("/app/admin/moderation")({
  component: ModerationPage,
});

function ModerationPage() {
  return (
    <RequireAuth>
      <AppShell>
        <AppPageHeader title="Listing moderation" />
        <ModerationScreen />
      </AppShell>
    </RequireAuth>
  );
}
