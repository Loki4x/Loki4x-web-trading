import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push-send";

type NotificationType = "ANNOUNCEMENT" | "TIER_UPGRADE" | "EXPIRY_WARNING" | "EXPIRY_ENDED";

type NotificationChannels = {
  website?: boolean;
  email?: boolean;
  push?: boolean;
};

export type AudienceTier = "ALL" | "FREE" | "VIP" | "MEMBERSHIP";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function emailHtml(title: string, message: string) {
  return `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">Loki4x Academy</p>
        <h2 style="color:#ffffff; font-size:18px;">${title}</h2>
        <p style="color:#c5c9d3; font-size:14px; line-height:1.6;">${message}</p>
      </div>
    </div>
  `;
}

export async function notifyUser({
  userId,
  email,
  type,
  title,
  message,
  channels = { website: true, email: true },
  client,
  pushUrl = "/dashboard",
}: {
  userId: string;
  email: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannels;
  // Pass a service-role client (lib/supabase/service.ts) when calling this
  // outside a logged-in user's request, e.g. from a webhook route.
  client?: SupabaseClient;
  /** Halaman yang dibuka saat notifikasi push diketuk. */
  pushUrl?: string;
}) {
  const supabase = client ?? (await createClient());

  if (channels.website) {
    await supabase.from("notifications").insert({ user_id: userId, type, title, message });
  }

  let sendEmailAllowed = channels.email;
  if (sendEmailAllowed && (type === "TIER_UPGRADE" || type === "EXPIRY_WARNING" || type === "EXPIRY_ENDED")) {
    const { data: prefs } = await supabase
      .from("profiles")
      .select("notify_receipts, notify_expiry")
      .eq("id", userId)
      .single();

    if (type === "TIER_UPGRADE" && prefs && prefs.notify_receipts === false) {
      sendEmailAllowed = false;
    }
    if ((type === "EXPIRY_WARNING" || type === "EXPIRY_ENDED") && prefs && prefs.notify_expiry === false) {
      sendEmailAllowed = false;
    }
  }

  if (sendEmailAllowed && email) {
    await sendEmail({ to: email, subject: title, html: emailHtml(title, message) });
  }

  if (channels.push) {
    await sendPushToUsers([{ userId, payload: { title, body: clip(message, 180), url: pushUrl } }]);
  }
}

export async function notifyAllUsers({
  type,
  title,
  message,
  channels = { website: true, email: true },
  tier = "ALL",
}: {
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannels;
  /** Batasi penerima ke satu tier (tier efektif: VIP/Membership kedaluwarsa dihitung Free). */
  tier?: AudienceTier;
}) {
  const supabase = await createClient();
  // Ambil semua profil per 1000 baris (batas default Supabase), supaya tidak terpotong saat user banyak.
  const data: { id: string; email: string | null; tier: string | null; vip_expires_at: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase.from("profiles").select("id, email, tier, vip_expires_at").order("id").range(from, from + 999);
    if (error) {
      console.error("[notifyAllUsers] gagal ambil profil:", error.message);
      break;
    }
    data.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }
  if (data.length === 0) return { recipients: 0 };

  const now = Date.now();
  const profiles = data.filter((p) => {
    if (tier === "ALL") return true;
    const stored = p.tier === "VIP" || p.tier === "MEMBERSHIP" ? p.tier : "FREE";
    const expired = !!p.vip_expires_at && new Date(p.vip_expires_at).getTime() <= now;
    const effective = stored !== "FREE" && expired ? "FREE" : stored;
    return effective === tier;
  });
  if (profiles.length === 0) return { recipients: 0 };

  if (channels.website) {
    for (let i = 0; i < profiles.length; i += 500) {
      await supabase.from("notifications").insert(profiles.slice(i, i + 500).map((p) => ({ user_id: p.id, type, title, message })));
    }
  }

  if (channels.email) {
    for (const p of profiles) {
      if (p.email) await sendEmail({ to: p.email, subject: title, html: emailHtml(title, message) });
    }
  }

  if (channels.push) {
    await sendPushToUsers(profiles.map((p) => ({ userId: p.id, payload: { title, body: clip(message, 180), url: "/dashboard" } })));
  }
  return { recipients: profiles.length };
}
