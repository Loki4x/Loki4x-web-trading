import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mencatat satu baris aktivitas login ke tabel login_activity, dipanggil
 * setelah sign-in berhasil (baik email/password maupun Google OAuth).
 * Gagal diam-diam kalau ada error — ini cuma buat ditampilkan di halaman
 * Settings, jadi nggak boleh menggagalkan proses login itu sendiri.
 */
export async function logLoginActivity(
  supabase: SupabaseClient,
  userId: string,
  request: { ip?: string | null; userAgent?: string | null }
) {
  try {
    await supabase.from("login_activity").insert({
      user_id: userId,
      ip: request.ip ?? null,
      user_agent: request.userAgent ?? null,
    });
  } catch {
    // diamkan — jangan sampai gagal catat aktivitas menggagalkan login
  }
}

/** Parser User-Agent super ringan, cukup buat label "Chrome · Windows" dsb. */
export function parseUserAgent(ua: string | null | undefined) {
  if (!ua) return { browser: "Browser tidak diketahui", os: "" };

  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}
