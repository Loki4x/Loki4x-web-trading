import { NextResponse } from "next/server";
import { adminAuth, adminRun, revalidate } from "@/lib/mobile-admin";
import { deletePositioningCore } from "@/lib/admin-ops-core";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return adminRun(async () => {
    const res = await deletePositioningCore(ctx, params.id);
    if (res.ok) revalidate("/admin/positioning", "/positioning");
    return res;
  });
}
