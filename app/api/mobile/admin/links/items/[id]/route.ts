import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { deleteLinkItemCore, setLinkActiveCore } from "@/lib/link-page-core";

export const dynamic = "force-dynamic";

// PATCH {active: boolean}
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await setLinkActiveCore(ctx, params.id, body.active === true);
    if (res.ok) revalidate("/links", "/admin/links");
    return res;
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return adminRun(async () => {
    const res = await deleteLinkItemCore(ctx, params.id);
    if (res.ok) revalidate("/links", "/admin/links");
    return res;
  });
}
