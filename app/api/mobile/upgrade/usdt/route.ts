import { NextResponse } from "next/server";
import { guarded, upgradeAuth, upgradeResponse } from "@/lib/mobile-upgrade";
import { submitUsdtPaymentCore } from "@/lib/upgrade-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/upgrade/usdt (multipart: plan, network, slip, note?, promo_code?) → bukti transfer USDT.
export async function POST(request: Request) {
  return guarded("usdt", async () => {
    const ctx = await upgradeAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    const slip = form.get("slip");
    return upgradeResponse(await submitUsdtPaymentCore(ctx, (k) => form.get(k), slip instanceof File ? slip : null));
  });
}
