import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { sendWeeklyCalendarEmails } from "@/lib/weekly-calendar-email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/weekly-calendar           -> kirim email berita high impact minggu ini (sekali per minggu)
// POST /api/cron/weekly-calendar?dry=1     -> hitung saja + contoh HTML, tidak mengirim email
// POST /api/cron/weekly-calendar?force=1   -> kirim ulang walau sudah pernah
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  try {
    const result = await sendWeeklyCalendarEmails(new Date(), {
      dryRun: url.searchParams.get("dry") === "1",
      force: url.searchParams.get("force") === "1",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/weekly-calendar]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
