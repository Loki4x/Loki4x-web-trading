import { NextResponse } from "next/server";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { deleteAcademyVideoCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return adminRun(() => deleteAcademyVideoCore(ctx, params.id));
}
