import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { RequireAuth } from "@/features/app/require-auth";
import { AssistantScreen } from "@/features/assistant/assistant-screen";

export const Route = createFileRoute("/app/assistant")({
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <RequireAuth>
      <AppShell>
        <AppPageHeader title="Talk to TIJAR" />
        <AssistantScreen />
      </AppShell>
    </RequireAuth>
  );
}
