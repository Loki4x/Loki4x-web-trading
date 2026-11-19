import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { addAcademyVideoCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/videos {category, title, description?, video_url, thumbnail_url?}
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(() => addAcademyVideoCore(ctx, (k) => body[k]));
}
