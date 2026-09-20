import Link from "next/link";
import Image from "next/image";

const legal = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const socials = [
  { href: "https://t.me/LokiForex", label: "Telegram" },
  { href: "https://www.tiktok.com/@lokiforex?_r=1&_t=ZS-99lRHOmRZht", label: "TikTok" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto max-w-content px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Loki4x Academy" width={32} height={32} className="rounded-full" />
              <span className="text-body font-display font-extrabold tracking-wide text-text-primary">
                LOKI4X ACADEMY
              </span>
            </div>
            <p className="mt-3 text-body-sm text-text-secondary">
              A focused trading journal and market news workspace, built for
              traders who take their process seriously.
            </p>
          </div>

          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-caption font-semibold text-text-muted">Legal</span>
              {legal.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-body-sm text-text-secondary hover:text-text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-caption font-semibold text-text-muted">Social</span>
              {socials.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body-sm text-text-secondary hover:text-text-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-body-sm text-text-muted">© 2026 Loki4x Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
