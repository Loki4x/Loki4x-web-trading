import { NextResponse } from "next/server";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { saveLinkProfileCore } from "@/lib/link-page-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/links/profile (multipart): display_name, bio, theme, social_<key>, avatar (File), remove_avatar=1
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return adminRun(async () => {
    const res = await saveLinkProfileCore(ctx, (k) => form.get(k));
    if (res.ok) revalidate("/links", "/admin/links");
    return res;
  });
}
