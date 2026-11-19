import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { sendAdminNotificationCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/notify {target: "ALL"|"USER", audience?, email?, title, message, ch_push, ch_website, ch_email: "true"|"false"}
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(() => sendAdminNotificationCore(ctx, (k) => body[k]));
}
