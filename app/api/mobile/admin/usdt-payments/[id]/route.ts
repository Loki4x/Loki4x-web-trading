import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { approveUsdtPaymentCore, rejectUsdtPaymentCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {action: "approve" | "reject", reason?: string}  (alasan dikirim ke user lewat notifikasi, push & email)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = body.action === "approve" ? await approveUsdtPaymentCore(ctx, params.id) : await rejectUsdtPaymentCore(ctx, params.id, body.reason);
    if (res.ok) revalidate("/admin/usdt-payments", "/upgrade", "/admin");
    return res;
  });
}
