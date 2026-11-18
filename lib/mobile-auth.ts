import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Tier } from "@/lib/tier";

/**
 * Autentikasi untuk aplikasi mobile (repo Loki4x-apk). Aplikasi mengirim access token Supabase
 * di header `Authorization: Bearer <token>`. Klien Supabase di sini memakai token itu, jadi
 * query tetap tunduk pada RLS seperti user yang login di web.
 */
export async function getMobileUser(request: Request): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return null;

  // Akun yang disuspend tidak boleh memakai API (sama seperti middleware web).
  const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.is_suspended) return null;

  return { user, supabase };
}

/** Tier yang berlaku sekarang (kedaluwarsa = FREE), sama dengan getMembershipStatus() di lib/tier.ts. */
export async function getMobileTier(supabase: SupabaseClient, userId: string): Promise<Tier> {
  const { data: profile } = await supabase.from("profiles").select("tier, vip_expires_at").eq("id", userId).single();
  const stored = (profile?.tier as Tier) ?? "FREE";
  if (stored === "FREE") return "FREE";
  const expired = !!profile?.vip_expires_at && new Date(profile.vip_expires_at) < new Date();
  return expired ? "FREE" : stored;
}
