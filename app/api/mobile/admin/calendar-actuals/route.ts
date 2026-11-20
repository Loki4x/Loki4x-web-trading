import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { saveCalendarActualCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {key, actual}: actual kosong = hapus.
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await saveCalendarActualCore(ctx, body.key, body.actual);
    if (res.ok) revalidate("/news", "/admin/calendar-actuals");
    return res;
  });
}
