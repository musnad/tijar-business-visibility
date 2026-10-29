import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { AdminConsoleScreen } from "@/features/admin/admin-console-screen";

export const Route = createFileRoute("/app/admin/")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <RequireAuth>
      <AppShell>
        <AdminConsoleScreen />
      </AppShell>
    </RequireAuth>
  );
}
