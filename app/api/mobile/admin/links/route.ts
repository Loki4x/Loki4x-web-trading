import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/mobile-admin";
import { loadLinkPage } from "@/lib/link-page-core";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// GET /api/mobile/admin/links → profil + semua link (termasuk yang disembunyikan) untuk Admin → Link Page di aplikasi.
export async function GET(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const data = await loadLinkPage(ctx.supabase, true);
  return NextResponse.json({ ...data, pageUrl: `${SITE_URL}/links` });
}
