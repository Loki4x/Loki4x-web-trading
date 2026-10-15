import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrivateR2Object } from "@/lib/r2";
import { CHAT_IMAGE_KEY_RE } from "@/lib/chat";

// Foto chat hanya bisa dibuka oleh pemilik percakapan dan admin. Pengecekan akses memakai RLS:
// kalau thread-nya tidak terlihat oleh user yang login, foto juga tidak diberikan.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  const match = CHAT_IMAGE_KEY_RE.exec(key);
  if (!match) return new NextResponse("Bad request", { status: 400 });

  const { data: thread } = await supabase.from("chat_threads").select("id").eq("id", match[1]).maybeSingle();
  if (!thread) return new NextResponse("Forbidden", { status: 403 });

  try {
    const object = await getPrivateR2Object(key);
    if (!object.Body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    console.error("[chat/image] gagal ambil berkas:", err instanceof Error ? err.message : err);
    return new NextResponse("Not found", { status: 404 });
  }
}
