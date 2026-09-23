import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/news", label: "News" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-topbar max-w-content items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary p-1.5">
            <Image src="/logo-white.png" alt="Loki4x Academy" width={32} height={32} className="h-full w-full object-contain" />
          </div>
          <span className="text-body font-display font-extrabold tracking-wide text-text-primary">
            LOKI4X ACADEMY
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-body-sm font-medium text-text-secondary transition-colors hover:text-text-primary sm:block"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary !px-5 !py-2.5 text-body-sm">
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
