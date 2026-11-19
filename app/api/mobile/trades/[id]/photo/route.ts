import { NextResponse } from "next/server";
import { uploadToR2, isAllowedUploadType, UPLOAD_MAX_BYTES } from "@/lib/r2";
import { isUuid } from "@/lib/validation";
import { journalAuth } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

type Slot = "before" | "after";
const slotOf = (v: unknown): Slot | null => (v === "before" || v === "after" ? v : null);

async function ownedTrade(ctx: Exclude<Awaited<ReturnType<typeof journalAuth>>, NextResponse>, tradeId: string) {
  if (!isUuid(tradeId)) return false;
  const { data } = await ctx.supabase.from("trades").select("id").eq("id", tradeId).eq("user_id", ctx.user.id).maybeSingle();
  return !!data;
}

// POST /api/mobile/trades/<id>/photo  (multipart: slot=before|after, photo=<gambar maks 2 MB>)
// Sama dengan upload foto before/after di form trade web (Cloudflare R2).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  if (!(await ownedTrade(ctx, params.id))) return NextResponse.json({ error: "Trade not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const slot = slotOf(form?.get("slot"));
  const file = form?.get("photo");
  if (!slot || !(file instanceof File) || file.size === 0) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!isAllowedUploadType(file.type) || file.type === "application/pdf") {
    return NextResponse.json({ error: ctx.t("Format foto harus JPG, PNG, WebP, atau GIF.") }, { status: 400 });
  }
  if (file.size > UPLOAD_MAX_BYTES) return NextResponse.json({ error: ctx.t("Ukuran foto maksimal 2 MB.") }, { status: 400 });

  const url = await uploadToR2(file, `${ctx.user.id}/${slot}`);
  if (!url) return NextResponse.json({ error: ctx.t("Gagal upload foto. Coba lagi.") }, { status: 500 });

  const { error } = await ctx.supabase
    .from("trades")
    .update({ [`${slot}_photo_url`]: url })
    .eq("id", params.id)
    .eq("user_id", ctx.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, url });
}

// DELETE /api/mobile/trades/<id>/photo?slot=before|after → lepas foto dari trade.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const slot = slotOf(new URL(request.url).searchParams.get("slot"));
  if (!slot) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { error } = await ctx.supabase
    .from("trades")
    .update({ [`${slot}_photo_url`]: null })
    .eq("id", params.id)
    .eq("user_id", ctx.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
