// Tipe & aturan halaman link (/links). Aman dipakai di komponen klien.

export type LinkTheme = "dark" | "light" | "glass" | "brand";
export const LINK_THEMES: { value: LinkTheme; label: string }[] = [
  { value: "dark", label: "Gelap" },
  { value: "light", label: "Terang" },
  { value: "glass", label: "Glassmorphism" },
  { value: "brand", label: "Biru Loki4x" },
];

export const SOCIALS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/akunmu" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@akunmu" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channelmu" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/akunmu" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/628xxxxxxxxxx" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/akunmu" },
  { key: "email", label: "Email", placeholder: "mailto:halo@domainmu.com" },
] as const;
export type SocialKey = (typeof SOCIALS)[number]["key"];

export interface LinkPageProfile {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  theme: LinkTheme;
  socials: Partial<Record<SocialKey, string>>;
  views?: number;
}

export interface LinkItem {
  id: string;
  kind: "LINK" | "HEADER";
  title: string;
  url: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean;
  active: boolean;
  position: number;
  clicks: number;
}

/** Hanya http(s), mailto:, dan tel: yang boleh dipakai (bukan javascript: dll). Kembalikan URL rapi atau null. */
export function safeLinkUrl(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || s.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!["http:", "https:", "mailto:", "tel:"].includes(u.protocol)) return null;
    if ((u.protocol === "http:" || u.protocol === "https:") && !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export const DEFAULT_PROFILE: LinkPageProfile = { display_name: "Loki4x Academy", bio: null, avatar_url: null, theme: "dark", socials: {} };
