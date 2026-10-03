import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cek batas pemakaian. Return true = boleh lanjut, false = kena limit.
 * Disimpan di Postgres (fungsi check_rate_limit) jadi konsisten di semua instance
 * serverless. Kalau database error, SENGAJA dibiarkan lolos (fail-open) supaya user
 * asli tidak terkunci gara-gara masalah teknis; error tetap dicatat di log.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createServiceClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] error:", error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit] error:", err);
    return true;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
