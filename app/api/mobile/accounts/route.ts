import { NextResponse } from "next/server";
import { createAccountCore, objectGetter } from "@/lib/journal-core";
import { journalAuth, readJson } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

// POST /api/mobile/accounts  {name, initial_balance, currency: "USD"|"IDR"} → buat akun journaling (maks 5).
export async function POST(request: Request) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const result = await createAccountCore(ctx.supabase, ctx.user.id, objectGetter(body), ctx.t);
  if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
