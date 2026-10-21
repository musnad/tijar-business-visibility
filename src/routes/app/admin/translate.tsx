import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { RequireAuth } from "@/features/app/require-auth";
import { SystemTranslateScreen } from "@/features/translate/system-translate-screen";

export const Route = createFileRoute("/app/admin/translate")({
  component: SystemTranslatePage,
});

function SystemTranslatePage() {
  return (
    <RequireAuth>
      <AppShell>
        <AppPageHeader title="System translation" />
        <SystemTranslateScreen />
      </AppShell>
    </RequireAuth>
  );
}
