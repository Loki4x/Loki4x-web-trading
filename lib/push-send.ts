import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { pushConfigured, sendPush, type PushPayload } from "@/lib/web-push";
import { fcmConfigured, sendFcm } from "@/lib/fcm";

export interface PushTarget {
  userId: string;
  payload: PushPayload;
}

type PushOpts = { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" };

/**
 * Kirim push ke semua perangkat milik tiap user: browser (Web Push) DAN aplikasi Android (FCM).
 * Payload bisa berbeda per user (mis. per bahasa). Langganan/token yang sudah tidak berlaku
 * otomatis dihapus. Tidak pernah melempar error.
 */
export async function sendPushToUsers(targets: PushTarget[], opts: PushOpts = {}): Promise<{ devices: number; sent: number }> {
  try {
    if (targets.length === 0) return { devices: 0, sent: 0 };
    const web = pushConfigured();
    const mobile = fcmConfigured();
    if (!web && !mobile) return { devices: 0, sent: 0 };

    const service = createServiceClient();
    const payloadByUser = new Map(targets.map((t) => [t.userId, t.payload]));
    const userIds = Array.from(payloadByUser.keys());

    const [w, m] = await Promise.all([
      web ? sendWeb(service, userIds, payloadByUser, opts) : { devices: 0, sent: 0 },
      mobile ? sendMobile(service, userIds, payloadByUser, opts) : { devices: 0, sent: 0 },
    ]);
    return { devices: w.devices + m.devices, sent: w.sent + m.sent };
  } catch (err) {
    console.error("[push-send] error:", err);
    return { devices: 0, sent: 0 };
  }
}

async function sendWeb(
  service: SupabaseClient,
  userIds: string[],
  payloadByUser: Map<string, PushPayload>,
  opts: PushOpts
): Promise<{ devices: number; sent: number }> {
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
}

/** Aplikasi Android (tabel mobile_push_tokens, supabase/mobile-push.sql). Tabel belum ada = dilewati. */
async function sendMobile(
  service: SupabaseClient,
  userIds: string[],
  payloadByUser: Map<string, PushPayload>,
  opts: PushOpts
): Promise<{ devices: number; sent: number }> {
  const tokens: { token: string; user_id: string }[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await service
      .from("mobile_push_tokens")
      .select("token, user_id")
      .in("user_id", userIds.slice(i, i + 200));
    if (error) {
      console.error("[push-send] gagal ambil token aplikasi:", error.message);
      return { devices: 0, sent: 0 };
    }
    tokens.push(...(data ?? []));
  }

  let sent = 0;
  const gone: string[] = [];
  for (let i = 0; i < tokens.length; i += 25) {
    const batch = tokens.slice(i, i + 25);
    const results = await Promise.all(batch.map((t) => sendFcm(t.token, payloadByUser.get(t.user_id) as PushPayload, opts)));
    results.forEach((r, idx) => {
      if (r.ok) sent++;
      else if (r.gone) gone.push(batch[idx].token);
    });
  }

  for (let i = 0; i < gone.length; i += 200) {
    await service.from("mobile_push_tokens").delete().in("token", gone.slice(i, i + 200));
  }
  return { devices: tokens.length, sent };
}
