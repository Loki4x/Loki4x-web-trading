import { NextResponse } from "next/server";
import { importTradeRows } from "@/lib/journal-core";
import { journalAuth, readJson } from "@/lib/mobile-journal";
import type { ImportRow } from "@/lib/trade-import";

export const dynamic = "force-dynamic";

// POST /api/mobile/trades/import  {account_id, rows: ImportRow[]}  (maks 500 baris per panggilan)
// Baris hasil parsing statement MT4/MT5/CSV di aplikasi; divalidasi ulang & anti-dobel di server.
export async function POST(request: Request) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  if (!body || !Array.isArray(body.rows)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const result = await importTradeRows(ctx.supabase, ctx.user.id, String(body.account_id ?? ""), body.rows as ImportRow[], ctx.t);
  if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, inserted: result.inserted, duplicates: result.duplicates, invalid: result.invalid });
}
