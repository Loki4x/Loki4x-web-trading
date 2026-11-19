import { mobileTierAuth } from "@/lib/mobile-auth";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { applyManualActuals, getManualActuals } from "@/lib/calendar-actuals";

export const dynamic = "force-dynamic";

// GET /api/mobile/calendar/all → kalender ekonomi lengkap (minggu lalu–minggu depan, semua impact)
// dengan Actual (termasuk input manual admin). Sama dengan /news di web: cukup login.
export async function GET(request: Request) {
  const auth = await mobileTierAuth(request, "FREE");
  if (auth instanceof Response) return auth;
  const [feed, manual] = await Promise.all([getEconomicCalendarRange(), getManualActuals(auth.supabase)]);
  return Response.json({ events: applyManualActuals(feed, manual) });
}
