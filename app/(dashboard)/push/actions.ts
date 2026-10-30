"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { pushConfigured, sendPush } from "@/lib/web-push";

export type PushActionResult = { ok: true } | { ok: false; error: "auth" | "invalid" | "rate_limited" | "not_configured" | "failed" };

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function valid(sub: SubscriptionInput | null | undefined): sub is SubscriptionInput {
  if (!sub || typeof sub.endpoint !== "string" || !sub.keys) return false;
  if (sub.endpoint.length > 2000 || !/^https:\/\//.test(sub.endpoint)) return false;
  const p = Buffer.from(String(sub.keys.p256dh ?? ""), "base64url");
  const a = Buffer.from(String(sub.keys.auth ?? ""), "base64url");
  return p.length === 65 && p[0] === 0x04 && a.length === 16;
}

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Daftarkan perangkat ini untuk menerima notifikasi push. */
export async function savePushSubscription(sub: SubscriptionInput, userAgent?: string): Promise<PushActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (!valid(sub)) return { ok: false, error: "invalid" };
  if (!(await rateLimit(`push-sub:${userId}`, 20, 600))) return { ok: false, error: "rate_limited" };

  const { error } = await createServiceClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: (userAgent ?? "").slice(0, 300) || null,
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("[push/save]", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

/** Matikan push di perangkat ini. */
export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (typeof endpoint !== "string" || !endpoint) return { ok: false, error: "invalid" };

  const { error } = await createServiceClient().from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) {
    console.error("[push/remove]", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

/** Kirim satu notifikasi tes ke semua perangkat milik user ini. */
export async function sendTestPush(): Promise<PushActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (!pushConfigured()) return { ok: false, error: "not_configured" };
  if (!(await rateLimit(`push-test:${userId}`, 5, 600))) return { ok: false, error: "rate_limited" };

  const service = createServiceClient();
  const { data, error } = await service.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (error || !data || data.length === 0) return { ok: false, error: "failed" };

  const results = await Promise.all(
    data.map((s) => sendPush(s, { title: "Loki4x Academy", body: "Notifikasi push berhasil diaktifkan ✅", url: "/settings" }))
  );
  const gone = data.filter((_, i) => {
    const r = results[i];
    return !r.ok && r.gone;
  });
  if (gone.length > 0) await service.from("push_subscriptions").delete().in("id", gone.map((g) => g.id));
  return results.some((r) => r.ok) ? { ok: true } : { ok: false, error: "failed" };
}
