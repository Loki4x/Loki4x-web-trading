import type { ReactNode } from "react";

// http(s)://… atau www.… sampai spasi berikutnya; tanda baca di akhir kalimat tidak ikut jadi link.
const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+\.[^\s<>"]+)/gi;
const TRAILING = /[.,!?;:)\]}'"]+$/;

/**
 * Ubah URL di teks pesan jadi link yang bisa diklik (buka tab baru, rel noopener).
 * `renderText` dipakai untuk potongan teks biasa (mis. menyorot @mention di komunitas).
 */
export function linkify(text: string, renderText: (s: string, key: string) => ReactNode = (s) => s, linkClassName = "text-[#4F8CFF] underline break-all"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    let match = m[0];
    const trail = match.match(TRAILING)?.[0] ?? "";
    if (trail) match = match.slice(0, -trail.length);
    const start = m.index ?? 0;
    if (start > last) out.push(renderText(text.slice(last, start), `t${i}`));
    const href = /^https?:\/\//i.test(match) ? match : `https://${match}`;
    out.push(
      <a key={`l${i}`} href={href} target="_blank" rel="noopener noreferrer nofollow" className={linkClassName} onClick={(e) => e.stopPropagation()}>
        {match}
      </a>
    );
    last = start + match.length;
    i++;
  }
  if (last < text.length) out.push(renderText(text.slice(last), `t${i}`));
  return out;
}
