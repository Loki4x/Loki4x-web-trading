import { NextResponse } from "next/server";
import { createTrade, objectGetter, parseTradeFields } from "@/lib/journal-core";
import { journalAuth, readJson } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

// POST /api/mobile/trades  {account_id, symbol, side, entry_price, exit_price?, pips?, pnl_manual?, trade_date, ...}
// Sama dengan form "Add Manual Trade" di web (tanpa foto), termasuk notifikasi batas risiko.
export async function POST(request: Request) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  const fields = body ? parseTradeFields(objectGetter(body)) : null;
  if (!body || !fields) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const result = await createTrade(ctx.supabase, ctx.user.id, String(body.account_id ?? ""), fields, ctx.t);
  if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
