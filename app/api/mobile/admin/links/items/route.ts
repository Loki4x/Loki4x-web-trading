import { NextResponse } from "next/server";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { saveLinkItemCore } from "@/lib/link-page-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/links/items (multipart): id? (kosong = tambah), kind, title, url, description, featured, image (File), remove_image=1
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return adminRun(async () => {
    const res = await saveLinkItemCore(ctx, (k) => form.get(k));
    if (res.ok) revalidate("/links", "/admin/links");
    return res;
  });
}
