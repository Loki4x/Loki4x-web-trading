import type { SupabaseClient } from "@supabase/supabase-js";
import { membershipState } from "@/lib/membership";
import { formatPlainCurrency } from "@/lib/utils";

/**
 * Data Admin Dashboard (signup, konversi, pendapatan, anggota yang segera berakhir, aktivitas terbaru).
 * Dipakai halaman /admin di web dan API admin aplikasi (/api/mobile/admin/dashboard).
 * `supabase` = klien admin yang login; `service` = service role (supaya semua pembayaran terhitung).
 */

const DAY = 86_400_000;
const WIB = 7 * 3_600_000; // hari dihitung menurut WIB (UTC+7)

export const PLAN_LABEL: Record<string, string> = { VIP: "VIP", MEMBERSHIP: "Membership", MEMBERSHIP_LIFETIME: "Membership Lifetime" };

const idr = (n: number) => formatPlainCurrency(n, "IDR");
const dayKey = (ts: number) => new Date(ts + WIB).toISOString().slice(0, 10);
const monthKey = (ts: number) => new Date(ts + WIB).toISOString().slice(0, 7);

export function timeAgo(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

// Supabase membatasi 1000 baris per query, jadi ambil halaman demi halaman.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) {
      console.error("[admin/dashboard]", error.message);
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

type ProfileRow = { id: string; full_name: string | null; email: string | null; tier: string | null; vip_expires_at: string | null; created_at: string };
type PaymentRow = { user_id: string; plan: string; amount: number; currency: string; status: string; created_at: string; completed_at: string | null };

export async function loadAdminDashboard(supabase: SupabaseClient, service: SupabaseClient) {
  const now = Date.now();

  const [profiles, payments] = await Promise.all([
    fetchAll<ProfileRow>((from, to) =>
      supabase.from("profiles").select("id, full_name, email, tier, vip_expires_at, created_at").order("created_at", { ascending: false }).range(from, to)
    ),
    fetchAll<PaymentRow>((from, to) =>
      service.from("payments").select("user_id, plan, amount, currency, status, created_at, completed_at").order("created_at", { ascending: false }).range(from, to)
    ),
  ]);

  const total = profiles.length;
  const states = profiles.map((p) => ({ p, s: membershipState(p, now) }));
  const paidNow = states.filter((x) => x.s.effectiveTier !== "FREE").length;
  const membershipNow = states.filter((x) => x.s.effectiveTier === "MEMBERSHIP").length;
  const vipNow = states.filter((x) => x.s.effectiveTier === "VIP").length;
  const freeNow = total - paidNow;

  // Signup
  const signupTs = profiles.map((p) => new Date(p.created_at).getTime());
  const last7 = signupTs.filter((t) => t > now - 7 * DAY).length;
  const prev7 = signupTs.filter((t) => t > now - 14 * DAY && t <= now - 7 * DAY).length;
  const signupDelta = prev7 === 0 ? (last7 > 0 ? "new" : "0%") : `${last7 >= prev7 ? "+" : ""}${Math.round(((last7 - prev7) / prev7) * 100)}%`;

  const signupsPerDay = new Map<string, number>();
  for (const t of signupTs) signupsPerDay.set(dayKey(t), (signupsPerDay.get(dayKey(t)) ?? 0) + 1);
  const signupData = Array.from({ length: 30 }).map((_, i) => {
    const ts = now - (29 - i) * DAY;
    return { day: dayKey(ts).slice(5).split("-").reverse().join("/"), signups: signupsPerDay.get(dayKey(ts)) ?? 0 };
  });

  // Pembayaran lunas
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const paidAt = (p: PaymentRow) => new Date(p.completed_at ?? p.created_at).getTime();
  const completedIdr = completed.filter((p) => p.currency === "IDR");
  const completedUsdt = completed.filter((p) => p.currency === "USDT");
  const thisMonth = monthKey(now);
  const revenueMonthIdr = completedIdr.filter((p) => monthKey(paidAt(p)) === thisMonth).reduce((a, p) => a + Number(p.amount), 0);
  const revenueAllIdr = completedIdr.reduce((a, p) => a + Number(p.amount), 0);
  const revenueAllUsdt = completedUsdt.reduce((a, p) => a + Number(p.amount), 0);
  const pendingUsdt = payments.filter((p) => p.status === "PENDING" && p.currency === "USDT").length;

  const revenueData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now + WIB);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    return {
      month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      idr: completedIdr.filter((p) => monthKey(paidAt(p)) === key).reduce((a, p) => a + Number(p.amount), 0),
    };
  });

  // Konversi: berapa persen pendaftar pernah membayar.
  const payers = new Set(completed.map((p) => p.user_id));
  const conversion = total > 0 ? (payers.size / total) * 100 : 0;

  // Rincian per paket
  const planRows = Object.keys(PLAN_LABEL).map((plan) => {
    const rows = completed.filter((p) => p.plan === plan);
    return {
      plan,
      count: rows.length,
      idr: rows.filter((p) => p.currency === "IDR").reduce((a, p) => a + Number(p.amount), 0),
      usdt: rows.filter((p) => p.currency === "USDT").reduce((a, p) => a + Number(p.amount), 0),
    };
  });

  // Pertumbuhan 6 bulan (kumulatif, menurut tier yang berlaku sekarang)
  const growthData = Array.from({ length: 6 }).map((_, i) => {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - (5 - i));
    ref.setDate(1);
    ref.setHours(23, 59, 59, 999);
    const upTo = states.filter((x) => new Date(x.p.created_at) <= ref);
    return {
      month: ref.toLocaleDateString("en-US", { month: "short" }),
      free: upTo.filter((x) => x.s.effectiveTier === "FREE").length,
      vip: upTo.filter((x) => x.s.effectiveTier !== "FREE").length,
    };
  });

  // Anggota yang segera berakhir (14 hari) dan yang baru berakhir (14 hari terakhir)
  const expiringSoon = states
    .filter((x) => x.s.effectiveTier !== "FREE" && x.s.daysLeft !== null && x.s.daysLeft <= 14)
    .sort((a, b) => (a.s.daysLeft ?? 0) - (b.s.daysLeft ?? 0));
  const recentlyExpired = states
    .filter((x) => x.s.expired && x.s.expiresAt && new Date(x.s.expiresAt).getTime() > now - 14 * DAY)
    .sort((a, b) => new Date(b.s.expiresAt!).getTime() - new Date(a.s.expiresAt!).getTime());

  // Aktivitas terbaru
  const nameOf = new Map(profiles.map((p) => [p.id, p.full_name || p.email || "A user"]));
  const items: { id: string; type: "signup" | "upgrade"; title: string; subtitle: string; timestamp: string; ts: number }[] = [
    ...profiles.slice(0, 5).map((p) => ({
      id: `signup-${p.id}`,
      type: "signup" as const,
      title: p.full_name || p.email || "New user",
      subtitle: "Joined Loki4x Academy",
      timestamp: timeAgo(new Date(p.created_at).getTime()),
      ts: new Date(p.created_at).getTime(),
    })),
    ...completed.slice(0, 5).map((p, i) => ({
      id: `pay-${i}-${p.user_id}`,
      type: "upgrade" as const,
      title: nameOf.get(p.user_id) ?? "A user",
      subtitle: `Paid ${PLAN_LABEL[p.plan] ?? p.plan} (${p.currency === "USDT" ? `${p.amount} USDT` : idr(Number(p.amount))})`,
      timestamp: timeAgo(paidAt(p)),
      ts: paidAt(p),
    })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8);


  return {
    total,
    paidNow,
    membershipNow,
    vipNow,
    freeNow,
    last7,
    signupDelta,
    conversion,
    revenueMonthIdr,
    revenueAllIdr,
    revenueAllUsdt,
    pendingUsdt,
    signupData,
    revenueData,
    planRows,
    growthData,
    expiringSoon: expiringSoon.map((x) => ({
      id: x.p.id,
      name: x.p.full_name || x.p.email || "User",
      email: x.p.email,
      tier: x.s.effectiveTier as string,
      daysLeft: x.s.daysLeft,
      expiresAt: x.s.expiresAt,
    })),
    recentlyExpired: recentlyExpired.map((x) => ({
      id: x.p.id,
      name: x.p.full_name || x.p.email || "User",
      email: x.p.email,
      tier: x.s.storedTier as string,
      daysLeft: null as number | null,
      expiresAt: x.s.expiresAt,
    })),
    activity: items,
  };
}
