import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailScreen } from "@/features/marketplace/order-detail-screen";

export const Route = createFileRoute("/shop/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  return <OrderDetailScreen orderId={orderId} />;
}
