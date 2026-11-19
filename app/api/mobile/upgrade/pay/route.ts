import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { guarded, upgradeAuth, upgradeResponse } from "@/lib/mobile-upgrade";
import { createPoketoPaymentCore } from "@/lib/upgrade-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/upgrade/pay {plan, promoCode?} → tagihan QRIS / Virtual Account (Poketo) + URL halaman bayar.
export async function POST(request: Request) {
  return guarded("pay", async () => {
    const ctx = await upgradeAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(request);
    return upgradeResponse(await createPoketoPaymentCore(ctx, body?.plan, body?.promoCode));
  });
}
