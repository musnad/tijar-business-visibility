import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";

export const Route = createFileRoute("/app/learn")({
  component: LearnLayoutRoute,
});

function LearnLayoutRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
