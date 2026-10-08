// Validasi input sisi server. Form di browser hanya kenyamanan; request bisa dikirim langsung.

export const SYMBOL_RE = /^[A-Z0-9._-]{1,20}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isUuid = (v: string) => UUID_RE.test(v);
export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);

export function isValidDate(v: string): boolean {
  return v.length > 0 && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

/** Ambil teks dari form, rapikan spasi, dan batasi panjangnya. */
export function cleanText(v: FormDataEntryValue | null | undefined, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

export function safeTimezone(tz: string, fallback = "Asia/Jakarta"): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

/**
 * URL foto lama dari form hanya diterima kalau memang file milik user ini di R2,
 * atau file publik di Supabase Storage (data lama). URL lain dibuang supaya user
 * tidak bisa menyimpan alamat gambar sembarang.
 */
export function ownedPhotoUrl(url: string | null, userId: string): string | null {
  if (!url) return null;
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (base && url.startsWith(`${base}/${userId}/`)) return url;
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && u.hostname.endsWith(".supabase.co") && u.pathname.startsWith("/storage/v1/object/public/")) {
      return url;
    }
  } catch {
    // URL tidak valid
  }
  return null;
}
