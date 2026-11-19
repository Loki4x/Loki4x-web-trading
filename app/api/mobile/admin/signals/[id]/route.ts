import { NextResponse } from "next/server";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { deleteSignalCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// DELETE /api/mobile/admin/signals/<id>
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return adminRun(() => deleteSignalCore(ctx, params.id));
}
