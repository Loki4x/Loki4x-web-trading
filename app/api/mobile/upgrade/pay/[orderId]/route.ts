import { NextResponse } from "next/server";
import { guarded, upgradeAuth } from "@/lib/mobile-upgrade";
import { checkPaymentStatusCore } from "@/lib/upgrade-core";

export const dynamic = "force-dynamic";

// GET /api/mobile/upgrade/pay/<orderId> → {status: "COMPLETED" | "PENDING" | "NOT_FOUND" | null}
export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  return guarded("pay-status", async () => {
    const ctx = await upgradeAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json({ status: await checkPaymentStatusCore(ctx, params.orderId.slice(0, 100)) });
  });
}
