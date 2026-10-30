import { createServiceClient } from "@/lib/supabase/service";
import { translate, type Locale } from "@/lib/i18n/dictionary";
import { sendPush, pushConfigured, type PushPayload } from "@/lib/web-push";

type Vars = Record<string, string | number>;

export interface SignalNotifyData {
  symbol: string;
  side: string;
  entry_price: number;
  take_profit: number | null;
  stop_loss: number | null;
  notes?: string | null;
  status?: string;
  result_pips?: number | null;
}

export type SignalNotifyEvent =
  | { kind: "NEW"; signal: SignalNotifyData }
  | { kind: "CLOSED"; signal: SignalNotifyData }
  | { kind: "UPDATE"; signal: SignalNotifyData; updateType: string; message: string | null; price: number | null };

const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n));

const UPDATE_LABEL: Record<string, string> = {
  SL_TO_BE: "SL digeser ke BE",
  PARTIAL_CLOSE: "Partial close",
  MOVE_SL: "Geser Stop Loss",
  MOVE_TP: "Geser Take Profit",
  NOTE: "Catatan",
};

const STATUS_LABEL: Record<string, string> = {
  TP: "Take Profit tercapai",
  SL: "Stop Loss kena",
  PARTIAL: "Partial close",
  CANCEL: "Sinyal dibatalkan",
  MISS: "Sinyal terlewat (tidak entry)",
};

/** Teks notifikasi (judul + isi singkat) per bahasa. */
export function buildSignalText(event: SignalNotifyEvent, locale: Locale): { title: string; body: string } {
  const t = (key: string, vars?: Vars) => translate(locale, key, vars);
  const sig = event.signal;
  const pair = `${sig.symbol} ${sig.side}`;

  if (event.kind === "NEW") {
    return {
      title: t("🔔 Sinyal baru: {pair}", { pair }),
      body: `Entry ${num(sig.entry_price)} · TP ${num(sig.take_profit)} · SL ${num(sig.stop_loss)}`,
    };
  }
  if (event.kind === "UPDATE") {
    const label = t(UPDATE_LABEL[event.updateType] ?? "Catatan");
    const body = event.message?.trim() || (event.price !== null ? `${t("Harga")} ${num(event.price)}` : "");
    return { title: t("📌 Update sinyal {pair}: {label}", { pair, label }), body };
  }
  const label = t(STATUS_LABEL[sig.status ?? ""] ?? "Sinyal ditutup");
  const icon = sig.status === "TP" ? "✅" : sig.status === "SL" ? "❌" : "ℹ️";
  let body = `Entry ${num(sig.entry_price)}`;
  if (sig.result_pips !== null && sig.result_pips !== undefined) {
    body += ` · Pips ${sig.result_pips > 0 ? "+" : ""}${sig.result_pips}`;
  }
  return { title: `${icon} ${pair} — ${label}`, body };
}

/**
 * Beritahu member tentang sinyal. Penerima: VIP/Membership AKTIF, notify_signals = true, tidak disuspend.
 *  - Notifikasi push ke semua perangkat yang sudah mengaktifkan push (semua jenis kejadian).
 *  - Lonceng dashboard (hanya untuk sinyal BARU).
 * Email sinyal sudah tidak dipakai. Tidak pernah melempar error (jangan sampai gagal kirim
 * notifikasi membuat posting sinyal gagal).
 */
export async function sendSignalNotifications(event: SignalNotifyEvent): Promise<{ pushed: number; bell: number }> {
  try {
    const service = createServiceClient();
    const now = Date.now();
    const recipients: { id: string; locale: Locale }[] = [];

    for (let from = 0; ; from += 1000) {
      const { data, error } = await service
        .from("profiles")
        .select("id, language, tier, vip_expires_at")
        .eq("notify_signals", true)
        .in("tier", ["VIP", "MEMBERSHIP"])
        .or("is_suspended.is.null,is_suspended.eq.false")
        .order("id")
        .range(from, from + 999);
      if (error) {
        console.error("[signal-notify] gagal ambil penerima:", error.message);
        break;
      }
      for (const p of data ?? []) {
        const active = !p.vip_expires_at || new Date(p.vip_expires_at).getTime() > now;
        if (active) recipients.push({ id: p.id, locale: p.language === "en" ? "en" : "id" });
      }
      if (!data || data.length < 1000) break;
    }

    if (recipients.length === 0) return { pushed: 0, bell: 0 };

    const text: Record<Locale, { title: string; body: string }> = {
      id: buildSignalText(event, "id"),
      en: buildSignalText(event, "en"),
    };

    // Lonceng dashboard: hanya sinyal BARU. type "ANNOUNCEMENT" supaya aman terhadap constraint tabel notifications.
    let bell = 0;
    if (event.kind === "NEW") {
      for (let i = 0; i < recipients.length; i += 500) {
        const rows = recipients.slice(i, i + 500).map((r) => ({
          user_id: r.id,
          type: "ANNOUNCEMENT",
          title: text[r.locale].title,
          message: text[r.locale].body,
        }));
        const { error } = await service.from("notifications").insert(rows);
        if (error) console.error("[signal-notify] gagal insert notifikasi:", error.message);
        else bell += rows.length;
      }
    }

    // Push ke perangkat.
    if (!pushConfigured()) return { pushed: 0, bell };
    const localeById = new Map(recipients.map((r) => [r.id, r.locale]));
    const subs: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < recipients.length; i += 200) {
      const ids = recipients.slice(i, i + 200).map((r) => r.id);
      const { data, error } = await service
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", ids);
      if (error) {
        console.error("[signal-notify] gagal ambil langganan push:", error.message);
        continue;
      }
      subs.push(...(data ?? []));
    }

    let pushed = 0;
    const gone: string[] = [];
    for (let i = 0; i < subs.length; i += 25) {
      const batch = subs.slice(i, i + 25);
      const results = await Promise.all(
        batch.map((s) => {
          const t = text[localeById.get(s.user_id) ?? "id"];
          const payload: PushPayload = { title: t.title, body: t.body, url: "/signals" };
          return sendPush(s, payload, { urgency: "high", ttl: 6 * 3600 });
        })
      );
      results.forEach((r, idx) => {
        if (r.ok) pushed++;
        else if (r.gone) gone.push(batch[idx].id);
      });
    }

    // Langganan yang sudah tidak berlaku (aplikasi dihapus / izin dicabut) dibersihkan.
    if (gone.length > 0) {
      for (let i = 0; i < gone.length; i += 200) {
        await service.from("push_subscriptions").delete().in("id", gone.slice(i, i + 200));
      }
    }
    return { pushed, bell };
  } catch (err) {
    console.error("[signal-notify] error:", err);
    return { pushed: 0, bell: 0 };
  }
}
