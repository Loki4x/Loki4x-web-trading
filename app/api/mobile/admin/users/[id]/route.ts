import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { getUserStatsCore, toggleSuspendCore, updateUserTierCore, type UserTier } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// GET: statistik trading user (10 trade terakhir, win rate).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(await getUserStatsCore(ctx, params.id));
}

// POST {action:"tier", tier, vip_expires_at}  |  {action:"suspend", suspend: boolean}
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res =
      body.action === "suspend"
        ? await toggleSuspendCore(ctx, params.id, body.suspend === true)
        : body.action === "tier"
          ? await updateUserTierCore(
              ctx,
              params.id,
              String(body.tier) as UserTier,
              typeof body.vip_expires_at === "string" && body.vip_expires_at ? body.vip_expires_at : null
            )
          : { ok: false, message: ctx.t("Terjadi kesalahan.") };
    if (res.ok) revalidate("/admin/users", "/admin");
    return res;
  });
}
