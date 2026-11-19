import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { getUserT } from "@/lib/i18n/server";
import type { UpgradeCtx } from "@/lib/upgrade-core";

/** Konteks upgrade untuk API aplikasi: cukup login (semua tier boleh membeli/memperpanjang). */
export async function upgradeAuth(request: Request): Promise<UpgradeCtx | NextResponse> {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { t } = await getUserT(auth.supabase, auth.user.id);
  return { supabase: auth.supabase, userId: auth.user.id, email: auth.user.email ?? null, t };
}

/** { ok: false, message } → 400 {error}; selain itu → 200 apa adanya. */
export function upgradeResponse(res: { ok: boolean; message?: string } & object) {
  if (!res.ok) return NextResponse.json({ error: res.message ?? "error" }, { status: 400 });
  return NextResponse.json(res);
}

/** Bungkus handler supaya error tak terduga tidak membocorkan detail server. */
export async function guarded(label: string, fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[mobile/upgrade/${label}]`, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
