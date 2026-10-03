import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Klaim" sebuah penanda secara atomik. true = kamu yang pertama (boleh lanjut kirim),
 * false = sudah pernah diklaim (lewati). Error tak terduga dilempar supaya terlihat di log.
 */
export async function claimMarker(service: SupabaseClient, key: string): Promise<boolean> {
  const { error } = await service.from("cron_markers").insert({ key });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation = sudah diklaim
  throw new Error(`cron_markers: ${error.message}`);
}
