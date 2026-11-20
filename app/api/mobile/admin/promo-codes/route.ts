import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { createPromoCodeCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {code, type: "PERCENT"|"FIXED_IDR", value, max_uses?, valid_from?, valid_until? (YYYY-MM-DD WIB), note?, plans: string[]}
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  const plans = Array.isArray(body.plans) ? body.plans : [];
  return adminRun(async () => {
    const res = await createPromoCodeCore(ctx, (k) => body[k], plans);
    if (res.ok) revalidate("/admin/promo-codes");
    return res;
  });
}
