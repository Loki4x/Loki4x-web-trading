import { NextResponse } from "next/server";
import { getMobileTier, getMobileUser } from "@/lib/mobile-auth";
import { loadDashboardExtras } from "@/lib/dashboard-extras";

export const dynamic = "force-dynamic";

// GET /api/mobile/dashboard → isi Beranda aplikasi (sama dengan /dashboard web).
export async function GET(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const tier = await getMobileTier(auth.supabase, auth.user.id);
    return NextResponse.json(await loadDashboardExtras(auth.supabase, auth.user.id, tier));
  } catch (err) {
    console.error("[mobile/dashboard]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
