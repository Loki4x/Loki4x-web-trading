import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { getUserT } from "@/lib/i18n/server";
import type { AdminCtx } from "@/lib/admin-core";

/** Autentikasi API admin aplikasi: login (Bearer) + profiles.is_admin. */
export async function adminAuth(request: Request): Promise<AdminCtx | NextResponse> {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await auth.supabase.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { t } = await getUserT(auth.supabase, auth.user.id);
  return { supabase: auth.supabase, actor: { id: auth.user.id, email: auth.user.email ?? null }, t };
}

/** {ok:false,message} → 400; {ok:true} → 200. Error tak terduga → 500 tanpa detail. */
export async function adminRun(fn: () => Promise<{ ok: boolean; message?: string }>): Promise<NextResponse> {
  try {
    const res = await fn();
    if (!res.ok) return NextResponse.json({ error: res.message ?? "error" }, { status: 400 });
    return NextResponse.json({ ...res, ok: true });
  } catch (err) {
    console.error("[mobile/admin]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "server_error" }, { status: 500 });
  }
}

export const fileOf = (v: FormDataEntryValue | null): File | null => (v instanceof File && v.size > 0 ? v : null);

/** Segarkan halaman web yang terdampak perubahan dari aplikasi. */
export function revalidate(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}
