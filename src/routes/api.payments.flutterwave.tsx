import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { flutterwaveConfigured, flutterwaveCreatePayment } from "@/lib/payments/flutterwave";
import { absoluteAppUrl } from "@/lib/site-url";
import { readEnvString, readSupabasePublicEnv } from "@/lib/supabase/runtime-env";

export const Route = createFileRoute("/api/payments/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!flutterwaveConfigured()) {
          return Response.json({ error: "Add FLUTTERWAVE_SECRET_KEY on the server to take card/online payments." }, { status: 503 });
        }
        const env = readSupabasePublicEnv();
        const service = readEnvString("SUPABASE_SERVICE_ROLE_KEY");
        if (!env || !service) {
          return Response.json({ error: "Server payment setup is incomplete." }, { status: 503 });
        }
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return Response.json({ error: "Sign in to pay." }, { status: 401 });
        }
        const body = (await request.json()) as { orderId?: string };
        const orderId = body.orderId?.trim();
        if (!orderId) return Response.json({ error: "Missing order." }, { status: 400 });

        const userClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: auth } },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();
        if (!user) return Response.json({ error: "Sign in to pay." }, { status: 401 });

        const admin = createClient(env.VITE_SUPABASE_URL, service);
        const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
        if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

        const { data: profile } = await admin.from("profiles").select("id, email, full_name, phone").eq("auth_id", user.id).maybeSingle();
        if (!profile || profile.id !== order.buyer_profile_id) {
          return Response.json({ error: "This order is not yours." }, { status: 403 });
        }

        const txRef = `tijar-${order.order_number}-${Date.now().toString().slice(-6)}`;
        await admin.from("payments").insert({
          order_id: orderId,
          provider: "flutterwave",
          status: "initiated",
          amount: order.total,
          currency: order.currency ?? "NGN",
          provider_reference: txRef,
          test_mode: !String(readEnvString("FLUTTERWAVE_SECRET_KEY")).startsWith("FLWSECK-"),
          metadata: { destination: "platform" },
        });
        await admin
          .from("orders")
          .update({ payment_method: "flutterwave", payment_destination: "platform" })
          .eq("id", orderId);

        const pay = await flutterwaveCreatePayment({
          txRef,
          amount: Number(order.total),
          email: profile.email || user.email || "buyer@tijar.ng",
          name: profile.full_name || "TIJAR buyer",
          phone: order.buyer_phone ?? profile.phone ?? undefined,
          redirectUrl: absoluteAppUrl(`/shop/orders/${orderId}`),
          orderId,
          businessId: order.business_id as string,
        });
        if (pay.error || !pay.link) {
          return Response.json({ error: pay.error ?? "Could not open Flutterwave." }, { status: 502 });
        }
        return Response.json({ link: pay.link });
      },
    },
  },
});
