import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { sendNewsReminders } from "@/lib/news-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/news-reminders  (jadwalkan tiap 5 menit)
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await sendNewsReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/news-reminders]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
