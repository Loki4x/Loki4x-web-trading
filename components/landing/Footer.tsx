import Link from "next/link";

const legal = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const socials = [
  { href: "https://twitter.com", label: "Twitter" },
  { href: "https://instagram.com", label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto max-w-content px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <span className="text-h3 font-display font-extrabold text-text-primary">
              Loki<span className="text-primary">4x</span>
            </span>
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
          <p className="text-body-sm text-text-muted">© 2026 Loki4x. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
