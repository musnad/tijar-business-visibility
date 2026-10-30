import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { flutterwaveConfigured, flutterwaveTransfer } from "@/lib/payments/flutterwave";
import { readEnvString, readSupabasePublicEnv } from "@/lib/supabase/runtime-env";

export const Route = createFileRoute("/api/payments/payout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = readSupabasePublicEnv();
        const service = readEnvString("SUPABASE_SERVICE_ROLE_KEY");
        if (!env || !service) {
          return Response.json({ error: "Server payment setup is incomplete." }, { status: 503 });
        }
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return Response.json({ error: "Sign in first." }, { status: 401 });
        }
        const body = (await request.json()) as { businessId?: string; amount?: number };
        const businessId = body.businessId?.trim();
        const amount = Number(body.amount);
        if (!businessId || !Number.isFinite(amount) || amount < 100) {
          return Response.json({ error: "Enter an amount of at least ₦100." }, { status: 400 });
        }

        const userClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: auth } },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();
        if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

        const admin = createClient(env.VITE_SUPABASE_URL, service);
        const { data: profile } = await admin.from("profiles").select("id").eq("auth_id", user.id).maybeSingle();
        if (!profile) return Response.json({ error: "Profile not found." }, { status: 403 });
        const { data: owned } = await admin
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .eq("owner_id", profile.id)
          .maybeSingle();
        const { data: member } = await admin
          .from("business_members")
          .select("business_id")
          .eq("business_id", businessId)
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (!owned && !member) return Response.json({ error: "Only shop staff can request a payout." }, { status: 403 });

        const { data: biz } = await admin
          .from("businesses")
          .select("payout_account_number, payout_bank_code, payout_account_name, business_name")
          .eq("id", businessId)
          .maybeSingle();
        if (!biz?.payout_account_number || !biz.payout_bank_code) {
          return Response.json({ error: "Add your bank account on Business → Payouts first." }, { status: 400 });
        }

        const { data: wallet } = await admin.from("seller_wallets").select("available_ngn").eq("business_id", businessId).maybeSingle();
        const available = Number(wallet?.available_ngn ?? 0);
        if (amount > available) {
          return Response.json({ error: `You can withdraw up to ₦${available.toLocaleString("en-NG")}.` }, { status: 400 });
        }

        const { data: row, error: insErr } = await admin
          .from("payout_requests")
          .insert({
            business_id: businessId,
            amount_ngn: amount,
            status: flutterwaveConfigured() ? "processing" : "pending",
            note: `Payout to ${biz.payout_account_name ?? "shop account"}`,
          })
          .select("id")
          .single();
        if (insErr || !row) return Response.json({ error: insErr?.message ?? "Could not create payout." }, { status: 500 });

        const pending = Number(wallet?.pending_ngn ?? 0);
        await admin
          .from("seller_wallets")
          .update({
            available_ngn: available - amount,
            pending_ngn: pending + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("business_id", businessId);

        if (!flutterwaveConfigured()) {
          return Response.json({
            ok: true,
            status: "pending",
            message: "Payout requested. It will send when Flutterwave is connected.",
          });
        }

        const sent = await flutterwaveTransfer({
          bankCode: biz.payout_bank_code,
          accountNumber: biz.payout_account_number,
          amount,
          reference: `tijar-po-${row.id}`,
          narration: `TIJAR payout ${biz.business_name ?? ""}`.trim(),
        });
        if (sent.error) {
          await admin.from("payout_requests").update({ status: "failed", note: sent.error }).eq("id", row.id);
          await admin
            .from("seller_wallets")
            .update({
              available_ngn: available,
              pending_ngn: pending,
              updated_at: new Date().toISOString(),
            })
            .eq("business_id", businessId);
          return Response.json({ error: sent.error }, { status: 502 });
        }
        await admin
          .from("payout_requests")
          .update({ status: "paid", provider_reference: sent.reference })
          .eq("id", row.id);
        await admin
          .from("seller_wallets")
          .update({ pending_ngn: pending, updated_at: new Date().toISOString() })
          .eq("business_id", businessId);
        return Response.json({ ok: true, status: "paid" });
      },
    },
  },
});
