import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shop/enquiries")({
  component: () => <Outlet />,
});
