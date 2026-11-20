import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { approveVipRequestCore, rejectVipRequestCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {action: "approve" | "reject"}
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = body.action === "approve" ? await approveVipRequestCore(ctx, params.id) : await rejectVipRequestCore(ctx, params.id);
    if (res.ok) revalidate("/admin/vip-requests", "/upgrade", "/admin");
    return res;
  });
}
