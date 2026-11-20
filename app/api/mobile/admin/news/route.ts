import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { addNewsEventCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

// POST {event_title, currency, impact_level, release_time (ISO), actual?, forecast?, previous?}
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await addNewsEventCore(ctx, (k) => body[k]);
    if (res.ok) revalidate("/admin/news", "/news");
    return res;
  });
}
