import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { guarded, upgradeAuth, upgradeResponse } from "@/lib/mobile-upgrade";
import { previewPromoCore } from "@/lib/upgrade-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/upgrade/promo {plan, code} → potongan harga (IDR & USDT).
export async function POST(request: Request) {
  return guarded("promo", async () => {
    const ctx = await upgradeAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(request);
    return upgradeResponse(await previewPromoCore(ctx, body?.plan, body?.code));
  });
}
