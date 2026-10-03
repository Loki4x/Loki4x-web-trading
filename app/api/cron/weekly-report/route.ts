import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { sendWeeklyReports } from "@/lib/weekly-report";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/weekly-report            -> kirim laporan minggu ini (sekali per minggu)
// POST /api/cron/weekly-report?dry=1      -> hitung saja, tidak mengirim email
// POST /api/cron/weekly-report?force=1    -> kirim ulang walau sudah pernah
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  try {
    const result = await sendWeeklyReports(new Date(), {
      dryRun: url.searchParams.get("dry") === "1",
      force: url.searchParams.get("force") === "1",
    });
    await createServiceClient().rpc("prune_cron_markers");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/weekly-report]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
