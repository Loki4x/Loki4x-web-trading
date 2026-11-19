import { NextResponse } from "next/server";
import { adminAuth, adminRun, fileOf } from "@/lib/mobile-admin";
import { addSignalCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/signals (multipart, field sama dengan form "Tambah Sinyal" di web + chart_image opsional)
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return adminRun(() => addSignalCore(ctx, (k) => form.get(k), fileOf(form.get("chart_image"))));
}
