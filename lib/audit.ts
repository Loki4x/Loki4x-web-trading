import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "TIER_CHANGED"
  | "USER_SUSPENDED"
  | "USER_UNSUSPENDED"
  | "USDT_APPROVED"
  | "USDT_REJECTED"
  | "VIP_REQUEST_APPROVED"
  | "VIP_REQUEST_REJECTED"
  | "PAYMENT_AUTO_COMPLETED"
  | "SIGNAL_CREATED"
  | "SIGNAL_STATUS_CHANGED"
  | "SIGNAL_UPDATE_POSTED"
  | "SIGNAL_DELETED"
  | "ANNOUNCEMENT_SENT"
  | "CALENDAR_ACTUAL_SET"
  | "REFERRAL_REWARDED"
  | "PROMO_CREATED"
  | "PROMO_TOGGLED";

export interface AuditActor {
  id: string | null;
  email: string | null;
}

/** Ambil identitas admin yang sedang login (dari sesi, bukan dari input client). */
export async function getAuditActor(supabase: SupabaseClient): Promise<AuditActor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { id: user?.id ?? null, email: user?.email ?? null };
}

/**
 * Catat aksi admin/sistem. Tidak pernah melempar error supaya kegagalan mencatat
 * tidak menggagalkan aksi utamanya (error tetap tampil di log server).
 * Untuk aksi sistem (webhook), kirim service client dan actor { id: null, email: "system" }.
 */
export async function logAudit(
  client: SupabaseClient,
  entry: {
    actor: AuditActor;
    action: AuditAction;
    targetUserId?: string | null;
    targetId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  try {
    const { error } = await client.from("audit_logs").insert({
      actor_id: entry.actor.id,
      actor_email: entry.actor.email,
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
    if (error) console.error("[audit] gagal mencatat:", error.message);
  } catch (err) {
    console.error("[audit] gagal mencatat:", err);
  }
}
