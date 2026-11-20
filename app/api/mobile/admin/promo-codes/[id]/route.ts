import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { setPromoActiveCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// PATCH {active: boolean}
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await setPromoActiveCore(ctx, params.id, body.active === true);
    if (res.ok) revalidate("/admin/promo-codes");
    return res;
  });
}
