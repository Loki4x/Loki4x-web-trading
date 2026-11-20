import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/mobile-admin";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

// GET /api/mobile/admin/data/<section>: data menu admin (dashboard, users, vip-requests, usdt-payments,
// promo-codes, news, positioning, calendar-actuals, referrals, audit-log, chat-threads, counts).
export async function GET(request: Request, { params }: { params: { section: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  if (!Object.prototype.hasOwnProperty.call(ADMIN_SECTIONS, params.section)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const data = await ADMIN_SECTIONS[params.section as AdminSection](ctx.supabase);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[mobile/admin/data]", params.section, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
