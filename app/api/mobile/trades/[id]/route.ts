import { NextResponse } from "next/server";
import { deleteTradeCore, objectGetter, parseTradeFields, updateTradeCore } from "@/lib/journal-core";
import { coreResponse, journalAuth, readJson } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

// PATCH /api/mobile/trades/:id  -> ubah trade (foto lama tetap dipertahankan)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  const fields = body ? parseTradeFields(objectGetter(body)) : null;
  if (!fields) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return coreResponse(await updateTradeCore(ctx.supabase, ctx.user.id, params.id, fields, ctx.t));
}

// DELETE /api/mobile/trades/:id
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return coreResponse(await deleteTradeCore(ctx.supabase, ctx.user.id, params.id));
}
