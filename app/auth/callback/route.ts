import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logLoginActivity } from "@/lib/login-activity";
import { attachReferralFromCookie } from "@/lib/referral";

// `next` dipakai untuk redirect setelah login, jadi harus dipastikan tetap di
// domain kita. Tanpa ini, nilai seperti "@situs-jahat.com" atau "//situs-jahat.com"
// bisa mengalihkan user ke situs lain (open redirect, biasa dipakai untuk phishing).
function safeNextPath(raw: string | null, origin: string): string {
  if (!raw) return "/dashboard";
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "/dashboard";
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
        const userAgent = request.headers.get("user-agent");
        await logLoginActivity(supabase, data.user.id, { ip, userAgent });
        // Login Google pertama kali lewat link undangan: hubungkan ke pengundang (hanya akun baru).
        await attachReferralFromCookie({ id: data.user.id, created_at: data.user.created_at });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const failPath = next.startsWith("/reset-password") ? "/forgot-password?error=reset_expired" : "/login?error=generic";
  return NextResponse.redirect(`${origin}${failPath}`);
}
