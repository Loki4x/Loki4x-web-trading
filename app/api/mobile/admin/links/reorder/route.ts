import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { reorderLinksCore } from "@/lib/link-page-core";

export const dynamic = "force-dynamic";

// POST {ids: string[]} → urutan dari atas ke bawah
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  return adminRun(async () => {
    const res = await reorderLinksCore(ctx, ids);
    if (res.ok) revalidate("/links", "/admin/links");
    return res;
  });
}
