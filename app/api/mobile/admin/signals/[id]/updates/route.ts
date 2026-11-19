import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { addSignalUpdateCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/signals/<id>/updates {type, message?, price?, send_email?: "1"}
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(() => addSignalUpdateCore(ctx, (k) => (k === "signal_id" ? params.id : body[k])));
}
