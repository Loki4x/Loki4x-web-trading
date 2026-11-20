import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { upsertPositioningCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {symbol, long_percent}: tambah / perbarui (per simbol).
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await upsertPositioningCore(ctx, (k) => body[k]);
    if (res.ok) revalidate("/admin/positioning", "/positioning");
    return res;
  });
}
