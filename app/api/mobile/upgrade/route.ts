import { NextResponse } from "next/server";
import { upgradeAuth } from "@/lib/mobile-upgrade";
import { membershipStatusOf } from "@/lib/tier";
import { PLAN_PRICE_IDR, purchasablePlans } from "@/lib/payment-constants";
import { USDT_PRICE, USDT_WALLETS } from "@/lib/usdt";
import { IB_BROKERS } from "@/lib/brokers";

export const dynamic = "force-dynamic";

// GET /api/mobile/upgrade → status membership, paket yang boleh dibeli, harga, dompet USDT,
// broker IB, dan pengajuan VIP via IB terakhir. Sama dengan isi halaman /upgrade di web.
export async function GET(request: Request) {
  const ctx = await upgradeAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const status = await membershipStatusOf(ctx.supabase, ctx.userId);
  const { data: vipRequest } = await ctx.supabase
    .from("vip_ib_requests")
    // "*" supaya tetap jalan walau kolom rejection_reason belum ditambahkan.
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    status,
    plans: purchasablePlans(status),
    priceIdr: PLAN_PRICE_IDR,
    priceUsdt: USDT_PRICE,
    wallets: USDT_WALLETS,
    brokers: IB_BROKERS,
    vipRequest: vipRequest
      ? {
          status: vipRequest.status,
          broker: vipRequest.broker ?? null,
          created_at: vipRequest.created_at,
          rejection_reason: (vipRequest as { rejection_reason?: string | null }).rejection_reason ?? null,
        }
      : null,
  });
}
