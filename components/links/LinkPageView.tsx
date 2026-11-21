import { ArrowUpRight, Instagram, Mail, MessageCircle, Music2, Send, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { SOCIALS, type LinkItem, type LinkPageProfile, type LinkTheme, type SocialKey } from "@/lib/link-page";
import { cx } from "@/lib/utils";

const SOCIAL_ICON: Record<SocialKey, LucideIcon> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  telegram: Send,
  whatsapp: MessageCircle,
  x: Twitter,
  email: Mail,
};

// Warna tiap tema ditulis tetap (tidak ikut tema terang/gelap pengunjung), supaya halaman selalu tampil sama.
const THEMES: Record<LinkTheme, { page: string; text: string; muted: string; card: string; cardHover: string; header: string; social: string; ring: string }> = {
  dark: {
    page: "bg-[#050810]",
    text: "text-white",
    muted: "text-slate-400",
    card: "bg-[#0D1321] border border-[#1B2337]",
    cardHover: "hover:border-[#5F85DB] hover:bg-[#121a2d]",
    header: "text-slate-400",
    social: "bg-[#0D1321] border border-[#1B2337] text-slate-300 hover:text-white hover:border-[#5F85DB]",
    ring: "ring-[#1B2337]",
  },
  light: {
    page: "bg-[#F4F6FB]",
    text: "text-[#1C1F26]",
    muted: "text-[#545B68]",
    card: "bg-white border border-[#E1E5EC] shadow-sm",
    cardHover: "hover:border-[#5F85DB] hover:shadow-md",
    header: "text-[#7C8494]",
    social: "bg-white border border-[#E1E5EC] text-[#545B68] hover:text-[#5F85DB] hover:border-[#5F85DB]",
    ring: "ring-white",
  },
  glass: {
    page: "bg-[#070b16]",
    text: "text-white",
    muted: "text-slate-300",
    card: "bg-white/[0.07] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
    cardHover: "hover:bg-white/[0.12] hover:border-white/30",
    header: "text-slate-300",
    social: "bg-white/[0.08] border border-white/15 backdrop-blur-xl text-slate-200 hover:text-white hover:bg-white/[0.15]",
    ring: "ring-white/20",
  },
  brand: {
    page: "bg-gradient-to-b from-[#1e3a8a] via-[#3f62c4] to-[#0e7490]",
    text: "text-white",
    muted: "text-blue-100",
    card: "bg-white text-[#13244f] border border-white shadow-lg",
    cardHover: "hover:-translate-y-0.5 hover:shadow-xl",
    header: "text-blue-100",
    social: "bg-white/15 border border-white/25 text-white hover:bg-white/25",
    ring: "ring-white/40",
  },
};

/**
 * Tampilan halaman link. Dipakai di /links (publik) dan sebagai pratinjau langsung di Admin → Link Page.
 * `hrefFor` menentukan tujuan tombol: di publik lewat /links/go/<id> (hitung klik), di pratinjau langsung ke URL.
 */
export function LinkPageView({
  profile,
  items,
  hrefFor,
  compact,
}: {
  profile: LinkPageProfile;
  items: LinkItem[];
  hrefFor: (item: LinkItem) => string;
  /** Pratinjau kecil di admin (tinggi mengikuti wadah, tanpa min-h-screen). */
  compact?: boolean;
}) {
  const th = THEMES[profile.theme] ?? THEMES.dark;
  const socials = SOCIALS.filter((s) => profile.socials?.[s.key]);
  const initial = (profile.display_name || "L").charAt(0).toUpperCase();

  return (
    <div className={cx("relative isolate overflow-hidden", compact ? "min-h-full" : "min-h-screen", th.page, th.text)}>
      {profile.theme === "glass" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 40% at 15% 5%, rgba(95,133,219,0.55), transparent 70%), radial-gradient(45% 35% at 95% 35%, rgba(6,182,212,0.4), transparent 70%), radial-gradient(50% 40% at 10% 90%, rgba(139,92,246,0.45), transparent 70%), radial-gradient(40% 35% at 90% 100%, rgba(16,185,129,0.35), transparent 70%)",
          }}
        />
      )}

      <main className={cx("mx-auto flex w-full max-w-[560px] flex-col items-center px-5", compact ? "py-8" : "py-12 sm:py-16")}>
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={profile.display_name} className={cx("h-24 w-24 rounded-full object-cover ring-4", th.ring)} />
        ) : (
          <div className={cx("flex h-24 w-24 items-center justify-center rounded-full bg-[#5F85DB] text-3xl font-bold text-white ring-4", th.ring)}>{initial}</div>
        )}

        <h1 className="mt-4 text-center text-xl font-bold">{profile.display_name}</h1>
        {profile.bio && <p className={cx("mt-2 max-w-[420px] whitespace-pre-line text-center text-sm leading-relaxed", th.muted)}>{profile.bio}</p>}

        {socials.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {socials.map((s) => {
              const Icon = SOCIAL_ICON[s.key];
              return (
                <a
                  key={s.key}
                  href={profile.socials[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className={cx("flex h-10 w-10 items-center justify-center rounded-full transition-colors", th.social)}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex w-full flex-col gap-3">
          {items.length === 0 && <p className={cx("text-center text-sm", th.muted)}>Belum ada link.</p>}
          {items.map((item) =>
            item.kind === "HEADER" ? (
              <p key={item.id} className={cx("mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em]", th.header)}>
                {item.title}
              </p>
            ) : item.featured && item.image_url ? (
              <a
                key={item.id}
                href={hrefFor(item)}
                target="_blank"
                rel="noopener noreferrer"
                className={cx("group overflow-hidden rounded-2xl transition-all duration-200", th.card, th.cardHover)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{item.title}</p>
                    {item.description && <p className="mt-0.5 line-clamp-2 text-sm opacity-75">{item.description}</p>}
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </a>
            ) : (
              <a
                key={item.id}
                href={hrefFor(item)}
                target="_blank"
                rel="noopener noreferrer"
                className={cx("group relative flex min-h-[60px] items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200", th.card, th.cardHover)}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="h-11 w-11 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1 text-center">
                  <p className="font-semibold leading-snug">{item.title}</p>
                  {item.description && <p className="mt-0.5 line-clamp-1 text-xs opacity-70">{item.description}</p>}
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
                  <ArrowUpRight className="h-4 w-4 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </a>
            )
          )}
        </div>

        <a href="/" className={cx("mt-10 text-xs font-semibold tracking-wide opacity-70 hover:opacity-100", th.muted)}>
          Loki4x Academy
        </a>
      </main>
    </div>
  );
}
