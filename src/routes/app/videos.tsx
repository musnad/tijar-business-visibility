import { Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { SellerVideosScreen } from "@/features/videos/seller-videos-screen";

export const Route = createFileRoute("/app/videos")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <Content />
    </RequireAuth>
  );
}

function Content() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return (
    <SellerPage>
      {({ businessId }) => <SellerVideosScreen businessId={businessId} />}
    </SellerPage>
  );
}
