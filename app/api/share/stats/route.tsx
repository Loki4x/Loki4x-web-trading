import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { formatCurrency } from "@/lib/utils";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Gambar statistik bulanan (1080x1350) untuk dibagikan. Hanya untuk Membership, hanya data milik sendiri.
 * Parameter: month=YYYY-MM, account=<uuid>, pnl=1 untuk menampilkan P&L (bawaan: disembunyikan).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAccess(await getCurrentUserTier(), "MEMBERSHIP")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") ?? "";
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthParam);
  if (!m) return NextResponse.json({ error: "bad month" }, { status: 400 });
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const showPnl = url.searchParams.get("pnl") === "1";
  const accountParam = url.searchParams.get("account") ?? undefined;

  const { activeAccount } = await resolveActiveAccount(supabase, user.id, accountParam && isUuid(accountParam) ? accountParam : undefined);

  const first = `${m[1]}-${m[2]}-01`;
  const next = new Date(Date.UTC(year, month0 + 1, 1)).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("trades")
    .select("pnl, pips")
    .eq("user_id", user.id)
    .eq("account_id", activeAccount.id)
    .eq("status", "CLOSED")
    .gte("trade_date", first)
    .lt("trade_date", next);

  const trades = data ?? [];
  const total = trades.length;
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);
  const grossWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const pnl = grossWin - grossLoss;
  const pips = trades.reduce((s, t) => s + (t.pips ?? 0), 0);
  const winRate = total > 0 ? (wins.length / total) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? null : 0;
  const pfText = profitFactor === null ? "∞" : profitFactor.toFixed(2);
  const positive = showPnl ? pnl >= 0 : winRate >= 50;

  const accent = positive ? "#22c55e" : "#ef4444";
  const monthLabel = `${MONTHS[month0]} ${year}`;

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#161B27", border: "2px solid #2A3144", borderRadius: 28, padding: "32px 28px" }}>
      <div style={{ display: "flex", fontSize: 28, color: "#8B93A7" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#FFFFFF", marginTop: 10 }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #0B0F1A 0%, #101727 60%, #0B0F1A 100%)",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 4, color: "#5F85DB" }}>LOKI4X ACADEMY</div>
          <div style={{ display: "flex", fontSize: 34, color: "#8B93A7", marginTop: 14 }}>Rekap Trading · {monthLabel}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#8B93A7" }}>{showPnl ? "Profit / Loss" : "Win Rate"}</div>
          <div style={{ display: "flex", fontSize: 190, fontWeight: 800, color: accent, marginTop: 10 }}>
            {showPnl ? formatCurrency(pnl, activeAccount.currency) : `${winRate.toFixed(0)}%`}
          </div>
          {showPnl && <div style={{ display: "flex", fontSize: 36, color: "#8B93A7", marginTop: 6 }}>Win rate {winRate.toFixed(0)}%</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 24 }}>
            {stat("Trade", String(total))}
            {stat("Profit Factor", pfText)}
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {stat("Menang / Kalah", `${wins.length} / ${losses.length}`)}
            {stat("Total Pips", `${pips >= 0 ? "+" : ""}${Math.round(pips * 10) / 10}`)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, color: "#8B93A7" }}>
          <div style={{ display: "flex" }}>Jurnal trading, sinyal & berita pasar</div>
          <div style={{ display: "flex", color: "#FFFFFF", fontWeight: 700 }}>loki4xacademy.web.id</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "no-store" } }
  );
}
