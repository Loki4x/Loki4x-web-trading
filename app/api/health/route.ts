import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Endpoint untuk monitor uptime (UptimeRobot, BetterStack, dll).
// 200 = web + database sehat, 503 = ada masalah. Tidak membocorkan detail error.
export async function GET() {
  try {
    const { error } = await createServiceClient().from("profiles").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
