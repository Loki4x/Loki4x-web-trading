import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUsers } from "@/lib/push-send";
import { translate, type Locale } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 5000;

interface Item {
  id: string;
  tier: string;
  date?: string;
}

function parseItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  const out: Item[] = [];
  for (const r of raw.slice(0, MAX_ITEMS)) {
    if (!r || typeof r !== "object") continue;
    const { id, tier, date } = r as Record<string, unknown>;
    if (typeof id !== "string" || !UUID.test(id)) continue;
    out.push({
      id,
      tier: typeof tier === "string" ? tier.slice(0, 20) : "",
      date: typeof date === "string" ? date.slice(0, 10) : undefined,
    });
  }
  return out;
}

// POST /api/cron/expiry-push
// Dipanggil oleh scripts/check-expiry.js (GitHub Actions) setelah ia selesai memproses masa aktif.
// Body: { warning: [{id, tier, date}], ended: [{id, tier}] }. Hanya mengirim PUSH (lonceng & email sudah diurus skripnya).
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as { warning?: unknown; ended?: unknown };
    const warning = parseItems(body.warning);
    const ended = parseItems(body.ended);
    const ids = Array.from(new Set([...warning, ...ended].map((i) => i.id)));
    if (ids.length === 0) return NextResponse.json({ ok: true, warning: 0, ended: 0, sent: 0 });

    // Hormati pilihan user: kalau pengingat masa aktif dimatikan di Settings, push juga tidak dikirim.
    const service = createServiceClient();
    const prefs = new Map<string, { locale: Locale; allowed: boolean }>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await service
        .from("profiles")
        .select("id, language, notify_expiry")
        .in("id", ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
      for (const p of data ?? []) {
        prefs.set(p.id, { locale: p.language === "en" ? "en" : "id", allowed: p.notify_expiry !== false });
      }
    }

    const targets: { userId: string; payload: { title: string; body: string; url: string; actions: { action: string; title: string }[] } }[] = [];
    const add = (item: Item, kind: "warning" | "ended") => {
      const pref = prefs.get(item.id);
      if (!pref || !pref.allowed) return;
      const t = (k: string, v?: Record<string, string | number>) => translate(pref.locale, k, v);
      const tier = item.tier || "VIP";
      targets.push({
        userId: item.id,
        payload:
          kind === "warning"
            ? {
                title: t("Langganan kamu akan berakhir besok"),
                body: t("Paket {tier} kamu akan berakhir besok ({date}). Perpanjang sekarang biar aksesmu nggak terputus.", { tier, date: item.date ?? "" }),
                url: "/upgrade",
                actions: [{ action: "renew", title: t("Perpanjang") }],
              }
            : {
                title: t("Langganan kamu sudah berakhir"),
                body: t("Paket {tier} kamu sudah berakhir. Upgrade lagi kapan aja buat buka semua fitur.", { tier }),
                url: "/upgrade",
                actions: [{ action: "renew", title: t("Perpanjang") }],
              },
      });
    };
    warning.forEach((i) => add(i, "warning"));
    ended.forEach((i) => add(i, "ended"));

    const { sent } = await sendPushToUsers(targets, { urgency: "normal", ttl: 12 * 3600 });
    return NextResponse.json({ ok: true, warning: warning.length, ended: ended.length, sent });
  } catch (err) {
    console.error("[cron/expiry-push]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
