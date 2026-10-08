import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrivateR2Object } from "@/lib/r2";

// Hanya admin yang boleh membuka bukti transfer. Kunci dibatasi ke pola yang kita buat sendiri,
// jadi endpoint ini tidak bisa dipakai membaca objek lain di bucket.
const KEY_RE = /^usdt-slips\/[0-9a-f-]{36}-\d{10,16}\.(jpg|png|webp|gif|pdf)$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return new NextResponse("Forbidden", { status: 403 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!KEY_RE.test(key)) return new NextResponse("Bad request", { status: 400 });

  try {
    const object = await getPrivateR2Object(key);
    if (!object.Body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    console.error("[admin/slip] gagal ambil berkas:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
