import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getMobileTier, getMobileUser } from "@/lib/mobile-auth";
import { hasAccess } from "@/lib/tier";
import { getUserT } from "@/lib/i18n/server";

type T = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Autentikasi API jurnal aplikasi: login (Bearer token) + tier Membership, sama seperti halaman
 * /trades di web. Mengembalikan konteks, atau NextResponse error yang langsung bisa di-return.
 */
export async function journalAuth(
  request: Request
): Promise<{ user: User; supabase: SupabaseClient; t: T } | NextResponse> {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAccess(await getMobileTier(auth.supabase, auth.user.id), "MEMBERSHIP")) {
    return NextResponse.json({ error: "membership_required" }, { status: 403 });
  }
  // Pesan error mengikuti bahasa yang dipilih user di profil.
  const { t } = await getUserT(auth.supabase, auth.user.id);
  return { ...auth, t };
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export function coreResponse(result: { success: true } | { success: false; message: string }, data?: object) {
  if (result.success) return NextResponse.json({ ok: true, ...(data ?? {}) });
  return NextResponse.json({ error: result.message }, { status: 400 });
}
