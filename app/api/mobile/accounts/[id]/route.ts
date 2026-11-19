import { NextResponse } from "next/server";
import { deleteAccountCore } from "@/lib/journal-core";
import { coreResponse, journalAuth } from "@/lib/mobile-journal";

export const dynamic = "force-dynamic";

// DELETE /api/mobile/accounts/<id> → hapus akun journaling beserta trade-nya (minimal tersisa 1 akun).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return coreResponse(await deleteAccountCore(ctx.supabase, ctx.user.id, params.id, ctx.t));
}
