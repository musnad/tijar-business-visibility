import { createFileRoute } from "@tanstack/react-router";

import { FavoritesScreen } from "@/features/marketplace/favorites-screen";

export const Route = createFileRoute("/shop/favorites")({
  component: FavoritesScreen,
});
