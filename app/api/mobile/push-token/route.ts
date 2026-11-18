import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Token FCM berbentuk string panjang tanpa spasi; batasi supaya tidak bisa diisi data sembarang.
const TOKEN_RE = /^[A-Za-z0-9_:\-.]{20,4096}$/;

async function readToken(request: Request): Promise<{ token: string; platform: "android" | "ios" } | null> {
  const body = (await request.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!TOKEN_RE.test(token)) return null;
  return { token, platform: body?.platform === "ios" ? "ios" : "android" };
}

function tableMissing(message: string) {
  return /mobile_push_tokens|relation|schema cache/i.test(message);
}

// POST /api/mobile/push-token  {token, platform}  -> daftarkan HP ini untuk menerima push
export async function POST(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await readToken(request);
  if (!input) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  // Ditulis dengan service role (tabel tidak bisa ditulis langsung oleh user). Kalau token yang sama
  // sebelumnya milik akun lain di HP ini (ganti akun), kepemilikannya dipindah ke akun yang login sekarang.
  const { error } = await createServiceClient()
    .from("mobile_push_tokens")
    .upsert(
      { token: input.token, user_id: auth.user.id, platform: input.platform, last_seen_at: new Date().toISOString() },
      { onConflict: "token" }
    );
  if (error) {
    console.error("[mobile/push-token] gagal simpan:", error.message);
    return NextResponse.json({ error: tableMissing(error.message) ? "not_configured" : "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/mobile/push-token  {token}  -> berhenti kirim push ke HP ini (logout / matikan notifikasi)
export async function DELETE(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await readToken(request);
  if (!input) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  const { error } = await createServiceClient()
    .from("mobile_push_tokens")
    .delete()
    .eq("token", input.token)
    .eq("user_id", auth.user.id);
  if (error && !tableMissing(error.message)) {
    console.error("[mobile/push-token] gagal hapus:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
