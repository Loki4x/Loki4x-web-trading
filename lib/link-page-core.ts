import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadToR2 } from "@/lib/r2";
import { safeLinkUrl, SOCIALS, LINK_THEMES, DEFAULT_PROFILE, type LinkItem, type LinkPageProfile } from "@/lib/link-page";
import type { ActionResult, AdminCtx } from "@/lib/admin-core";

/**
 * Inti halaman link (/links): baca untuk publik, dan aksi admin (profil, tambah/ubah/hapus/urutkan link).
 * Dipakai server action web (app/admin/links/actions.ts) dan nanti API aplikasi.
 */

type Getter = (key: string) => unknown;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fileOf = (v: unknown): File | null => (v instanceof File && v.size > 0 ? v : null);
const IMAGE_FAILED = "Foto gagal diunggah. Pakai JPG/PNG/WebP maksimal 2 MB.";

/** Profil + link. `includeInactive` hanya untuk admin (RLS tetap menyaring untuk publik). */
export async function loadLinkPage(supabase: SupabaseClient, includeInactive = false): Promise<{ profile: LinkPageProfile; items: LinkItem[] }> {
  let q = supabase.from("link_items").select("id, kind, title, url, description, image_url, featured, active, position, clicks").order("position", { ascending: true }).order("created_at", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const [{ data: page }, { data: items }] = await Promise.all([
    supabase.from("link_page").select("display_name, bio, avatar_url, theme, socials, views").eq("id", 1).maybeSingle(),
    q,
  ]);
  return {
    profile: page ? ({ ...DEFAULT_PROFILE, ...page, socials: (page.socials as LinkPageProfile["socials"]) ?? {} } as LinkPageProfile) : DEFAULT_PROFILE,
    items: (items ?? []) as LinkItem[],
  };
}

export async function saveLinkProfileCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const { supabase, t } = ctx;
  const displayName = str(get("display_name"), 60);
  if (!displayName) return { ok: false, message: t("Nama wajib diisi.") };
  const theme = String(get("theme") ?? "dark");
  if (!LINK_THEMES.some((x) => x.value === theme)) return { ok: false, message: t("Terjadi kesalahan.") };

  const socials: Record<string, string> = {};
  for (const s of SOCIALS) {
    const raw = str(get(`social_${s.key}`), 300);
    if (!raw) continue;
    const url = safeLinkUrl(s.key === "email" && !raw.startsWith("mailto:") && raw.includes("@") ? `mailto:${raw}` : raw);
    if (!url) return { ok: false, message: t("Link {name} tidak valid.", { name: s.label }) };
    socials[s.key] = url;
  }

  const update: Record<string, unknown> = { display_name: displayName, bio: str(get("bio"), 300) || null, theme, socials, updated_at: new Date().toISOString() };
  const avatar = fileOf(get("avatar"));
  if (avatar) {
    const url = await uploadToR2(avatar, "link-page/avatar");
    if (!url) return { ok: false, message: t(IMAGE_FAILED) };
    update.avatar_url = url;
  } else if (get("remove_avatar") === "1") {
    update.avatar_url = null;
  }

  const { error } = await supabase.from("link_page").upsert({ id: 1, ...update });
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  return { ok: true };
}

/** Tambah (tanpa id) atau ubah (dengan id) satu link / judul bagian. */
export async function saveLinkItemCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const { supabase, t } = ctx;
  const id = str(get("id"), 64);
  const kind = get("kind") === "HEADER" ? "HEADER" : "LINK";
  const title = str(get("title"), 100);
  if (!title) return { ok: false, message: t("Judul wajib diisi.") };

  const row: Record<string, unknown> = { kind, title, updated_at: new Date().toISOString() };
  if (kind === "LINK") {
    const url = safeLinkUrl(get("url"));
    if (!url) return { ok: false, message: t("URL tidak valid. Pakai alamat lengkap, mis. https://contoh.com") };
    row.url = url;
    row.description = str(get("description"), 200) || null;
    row.featured = get("featured") === "1" || get("featured") === "true" || get("featured") === "on";
    const image = fileOf(get("image"));
    if (image) {
      const uploaded = await uploadToR2(image, "link-page/item");
      if (!uploaded) return { ok: false, message: t(IMAGE_FAILED) };
      row.image_url = uploaded;
    } else if (get("remove_image") === "1") {
      row.image_url = null;
    }
  } else {
    Object.assign(row, { url: null, description: null, image_url: null, featured: false });
  }

  if (id) {
    const { error } = await supabase.from("link_items").update(row).eq("id", id);
    if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  } else {
    const { data: last } = await supabase.from("link_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("link_items").insert({ ...row, position: (last?.position ?? -1) + 1 });
    if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  }
  return { ok: true };
}

export async function setLinkActiveCore(ctx: AdminCtx, id: string, active: boolean): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("link_items").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? { ok: false, message: ctx.t("Gagal menyimpan: {detail}", { detail: error.message }) } : { ok: true };
}

export async function deleteLinkItemCore(ctx: AdminCtx, id: string): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("link_items").delete().eq("id", id);
  return error ? { ok: false, message: ctx.t("Gagal menyimpan: {detail}", { detail: error.message }) } : { ok: true };
}

/** Simpan urutan baru: daftar id dari atas ke bawah. */
export async function reorderLinksCore(ctx: AdminCtx, ids: string[]): Promise<ActionResult> {
  const clean = ids.filter((x) => typeof x === "string" && x.length <= 64).slice(0, 500);
  const results = await Promise.all(clean.map((id, position) => ctx.supabase.from("link_items").update({ position }).eq("id", id)));
  const failed = results.find((r) => r.error);
  return failed?.error ? { ok: false, message: ctx.t("Gagal menyimpan: {detail}", { detail: failed.error.message }) } : { ok: true };
}
