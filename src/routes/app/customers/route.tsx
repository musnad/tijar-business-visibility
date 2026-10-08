import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";

export const Route = createFileRoute("/app/customers")({
  component: CustomersLayoutRoute,
});

function CustomersLayoutRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
