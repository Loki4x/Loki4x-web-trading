import { createServiceClient } from "@/lib/supabase/service";
import { pushConfigured, sendPush, type PushPayload } from "@/lib/web-push";

export interface PushTarget {
  userId: string;
  payload: PushPayload;
}

/**
 * Kirim push ke semua perangkat milik tiap user. Payload bisa berbeda per user (mis. per bahasa).
 * Langganan yang sudah tidak berlaku (404/410) otomatis dihapus. Tidak pernah melempar error.
 */
export async function sendPushToUsers(
  targets: PushTarget[],
  opts: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {}
): Promise<{ devices: number; sent: number }> {
  try {
    if (targets.length === 0 || !pushConfigured()) return { devices: 0, sent: 0 };
    const service = createServiceClient();
    const payloadByUser = new Map(targets.map((t) => [t.userId, t.payload]));
    const userIds = Array.from(payloadByUser.keys());

    const subs: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < userIds.length; i += 200) {
      const { data, error } = await service
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", userIds.slice(i, i + 200));
      if (error) {
        console.error("[push-send] gagal ambil langganan:", error.message);
        continue;
      }
      subs.push(...(data ?? []));
    }

    let sent = 0;
    const gone: string[] = [];
    for (let i = 0; i < subs.length; i += 25) {
      const batch = subs.slice(i, i + 25);
      const results = await Promise.all(
        batch.map((s) => sendPush(s, payloadByUser.get(s.user_id) as PushPayload, { urgency: opts.urgency ?? "high", ttl: opts.ttl ?? 6 * 3600 }))
      );
      results.forEach((r, idx) => {
        if (r.ok) sent++;
        else if (r.gone) gone.push(batch[idx].id);
      });
    }

    for (let i = 0; i < gone.length; i += 200) {
      await service.from("push_subscriptions").delete().in("id", gone.slice(i, i + 200));
    }
    return { devices: subs.length, sent };
  } catch (err) {
    console.error("[push-send] error:", err);
    return { devices: 0, sent: 0 };
  }
}
