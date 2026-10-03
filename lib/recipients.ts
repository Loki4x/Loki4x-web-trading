import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n/dictionary";

export interface Recipient {
  id: string;
  email: string | null;
  name: string | null;
  locale: Locale;
  tier: "FREE" | "VIP" | "MEMBERSHIP"; // tier EFEKTIF (kedaluwarsa dihitung FREE)
}

const RANK = { FREE: 0, VIP: 1, MEMBERSHIP: 2 } as const;
export const tierAtLeast = (tier: Recipient["tier"], min: Recipient["tier"]) => RANK[tier] >= RANK[min];

/**
 * Ambil penerima notifikasi: pref kolom `prefColumn` = true, tidak disuspend.
 * Tier dihitung efektif (membership kedaluwarsa dianggap FREE).
 */
export async function fetchRecipients(
  service: SupabaseClient,
  prefColumn: "notify_weekly" | "notify_news" | "notify_signals",
  opts: { requireEmail?: boolean } = {}
): Promise<Recipient[]> {
  const out: Recipient[] = [];
  const now = Date.now();

  for (let from = 0; ; from += 1000) {
    let q = service
      .from("profiles")
      .select("id, email, full_name, language, tier, vip_expires_at")
      .eq(prefColumn, true)
      .or("is_suspended.is.null,is_suspended.eq.false");
    if (opts.requireEmail) q = q.not("email", "is", null);

    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw new Error(`fetchRecipients: ${error.message}`);

    for (const p of data ?? []) {
      const stored = p.tier === "VIP" || p.tier === "MEMBERSHIP" ? p.tier : "FREE";
      const expired = p.vip_expires_at && new Date(p.vip_expires_at).getTime() <= now;
      out.push({
        id: p.id,
        email: p.email,
        name: p.full_name,
        locale: p.language === "en" ? "en" : "id",
        tier: stored !== "FREE" && expired ? "FREE" : stored,
      });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}
