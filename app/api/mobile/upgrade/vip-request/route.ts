import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { guarded, upgradeAuth, upgradeResponse } from "@/lib/mobile-upgrade";
import { submitVipRequestCore } from "@/lib/upgrade-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/upgrade/vip-request {broker, broker_email, trading_account_id, first_deposit, agree_terms: "on"}
export async function POST(request: Request) {
  return guarded("vip-request", async () => {
    const ctx = await upgradeAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(request);
    if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return upgradeResponse(await submitVipRequestCore(ctx, (k) => body[k]));
  });
}
