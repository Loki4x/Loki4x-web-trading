import { NextResponse } from "next/server";
import { objectGetter, updateAccountRulesCore } from "@/lib/journal-core";
import { coreResponse, journalAuth, readJson } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

// PUT /api/mobile/accounts/:id/rules  {max_daily_loss_pct, max_trades_per_day, max_consecutive_losses,
//                                     monthly_profit_target, target_win_rate}  (kosong/null = tidak dipakai)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return coreResponse(await updateAccountRulesCore(ctx.supabase, ctx.user.id, params.id, objectGetter(body), ctx.t));
}
