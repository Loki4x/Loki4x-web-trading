import { NextResponse } from "next/server";
import { adminAuth, adminRun, fileOf } from "@/lib/mobile-admin";
import { updateSignalStatusCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim().replace(",", ".") : "";
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

// POST /api/mobile/admin/signals/<id>/status (multipart: status, current_price?, result_pips?, closed_at? "YYYY-MM-DDTHH:mm" WIB, result_image?)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const price = numOrNull(form.get("current_price"));
  const pips = numOrNull(form.get("result_pips"));
  if (Number.isNaN(price) || Number.isNaN(pips)) return NextResponse.json({ error: ctx.t("Ada angka yang tidak valid.") }, { status: 400 });
  const closedAt = String(form.get("closed_at") ?? "").trim() || null;
  return adminRun(() =>
    updateSignalStatusCore(ctx, params.id, String(form.get("status") ?? ""), price, pips, closedAt, fileOf(form.get("result_image")))
  );
}
