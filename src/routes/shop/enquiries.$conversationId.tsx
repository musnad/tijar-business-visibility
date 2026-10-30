import { createFileRoute } from "@tanstack/react-router";

import { ShopChatThreadScreen } from "@/features/marketplace/messages-screen";

export const Route = createFileRoute("/shop/enquiries/$conversationId")({
  component: ShopChatThreadPage,
});

function ShopChatThreadPage() {
  const { conversationId } = Route.useParams();
  return <ShopChatThreadScreen conversationId={conversationId} />;
}
