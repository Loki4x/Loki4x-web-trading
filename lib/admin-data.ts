import type { SupabaseClient } from "@supabase/supabase-js";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { calendarEventKey, getManualActuals } from "@/lib/calendar-actuals";
import { fetchAdminChatThreads } from "@/lib/chat-admin";
import { loadAdminDashboard } from "@/lib/admin-dashboard";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Data menu admin untuk aplikasi Android (GET /api/mobile/admin/data/<section>).
 * Query-nya sama dengan halaman /admin/... di web; `supabase` = klien admin yang login (RLS admin).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

async function users(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_admin, tier, vip_expires_at, is_suspended, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function vipRequests(supabase: SupabaseClient) {
  const { data } = await supabase.from("vip_ib_requests").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
  return data ?? [];
}

async function usdtPayments(supabase: SupabaseClient) {
  const { data: rows, error } = await supabase.from("payments").select("*").eq("currency", "USDT").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((rows ?? []).map((p) => p.user_id as string)));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  return (rows ?? []).map((p) => ({ ...p, profiles: byId.get(p.user_id as string) ?? null }));
}

async function promoCodes(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("promo_codes")
    .select("id, code, type, value, max_uses, used_count, valid_from, valid_until, plans, active, note")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function news(supabase: SupabaseClient) {
  const { data } = await supabase.from("news").select("*").order("release_time", { ascending: false }).limit(300);
  return data ?? [];
}

async function positioning(supabase: SupabaseClient) {
  const { data } = await supabase.from("positioning").select("id, symbol, long_percent, short_percent, updated_at").order("symbol", { ascending: true });
  return data ?? [];
}

async function calendarActuals(supabase: SupabaseClient) {
  const [events, saved] = await Promise.all([getEconomicCalendarRange(), getManualActuals(supabase)]);
  const now = Date.now();
  return events
    .filter(
      (e) =>
        (e.impact === "HIGH" || e.impact === "MEDIUM") &&
        new Date(e.dateISO).getTime() >= now - 4 * DAY_MS &&
        new Date(e.dateISO).getTime() <= now + DAY_MS
    )
    .map((e) => ({
      key: calendarEventKey(e),
      dateISO: e.dateISO,
      currency: e.currency,
      impact: e.impact,
      title: e.title,
      forecast: e.forecast,
      previous: e.previous,
      actual: saved.get(calendarEventKey(e)) ?? "",
    }))
    .sort((a, b) => {
      const pa = new Date(a.dateISO).getTime() <= now && !a.actual ? 0 : 1;
      const pb = new Date(b.dateISO).getTime() <= now && !b.actual ? 0 : 1;
      return pa - pb || new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime();
    });
}

async function referrals(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id, status, reward_days, note, created_at, rewarded_at, claimed_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.referrer_id as string, r.referred_id as string])));
  const emails = new Map<string, string | null>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
    for (const p of profiles ?? []) emails.set(p.id as string, (p.email as string | null) ?? null);
  }
  return rows.map((r) => ({
    ...r,
    referrer_email: emails.get(r.referrer_id as string) ?? null,
    referred_email: emails.get(r.referred_id as string) ?? null,
  }));
}

async function auditLog(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_email, action, target_user_id, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  return data ?? [];
}

async function counts(supabase: SupabaseClient) {
  const head = { count: "exact" as const, head: true };
  const [vip, usdt, chat] = await Promise.all([
    supabase.from("vip_ib_requests").select("id", head).eq("status", "PENDING"),
    supabase.from("payments").select("id", head).eq("currency", "USDT").eq("status", "PENDING"),
    supabase.from("chat_threads").select("id", head).eq("admin_unread", true),
  ]);
  return { vipPending: vip.count ?? 0, usdtPending: usdt.count ?? 0, chatUnread: chat.count ?? 0 };
}

export const ADMIN_SECTIONS = {
  dashboard: (s: SupabaseClient) => loadAdminDashboard(s, createServiceClient()),
  counts,
  users,
  "vip-requests": vipRequests,
  "usdt-payments": usdtPayments,
  "promo-codes": promoCodes,
  news,
  positioning,
  "calendar-actuals": calendarActuals,
  referrals,
  "audit-log": auditLog,
  "chat-threads": fetchAdminChatThreads,
} satisfies Record<string, (s: SupabaseClient) => Promise<unknown>>;

export type AdminSection = keyof typeof ADMIN_SECTIONS;
