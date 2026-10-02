import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

// Dipanggil dari layout dashboard kalau user yang login ternyata ditangguhkan.
// Sesinya harus dihapus di sini (Route Handler boleh mengubah cookie, Server
// Component tidak), kalau tidak middleware akan melempar user yang masih login
// dari /login kembali ke /dashboard dan terjadi redirect berputar.
//
// Sesi HANYA diputus kalau user ini memang ditangguhkan, supaya link ini nggak
// bisa dipakai orang lain untuk memaksa seseorang logout.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).single();
  if (!profile?.is_suspended) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  await supabase.auth.signOut();

  const { t } = await getT();
  const message = t("Akun kamu ditangguhkan. Hubungi admin untuk info lebih lanjut.");
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}
