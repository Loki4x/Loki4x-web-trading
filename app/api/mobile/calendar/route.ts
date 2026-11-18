import { NextResponse } from "next/server";
import { getMobileTier, getMobileUser } from "@/lib/mobile-auth";
import { hasAccess } from "@/lib/tier";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/mobile/calendar -> berita HIGH impact 7 hari ke depan (aplikasi mobile, khusus Membership)
export async function GET(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAccess(await getMobileTier(auth.supabase, auth.user.id), "MEMBERSHIP")) {
    return NextResponse.json({ error: "membership_required" }, { status: 403 });
  }

  const now = Date.now();
  const events = (await getEconomicCalendarRange())
    .filter((e) => {
      const t = new Date(e.dateISO).getTime();
      return e.impact === "HIGH" && t >= now - 60 * 60 * 1000 && t < now + WEEK_MS;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      currency: e.currency,
      dateISO: e.dateISO,
      forecast: e.forecast,
      previous: e.previous,
      actual: e.actual,
    }));

  return NextResponse.json({ events });
}
