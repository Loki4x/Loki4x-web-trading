import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-8 flex justify-center">
          <span className="text-h2 font-display font-extrabold text-text-primary">
            Loki<span className="text-primary">4x</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-8">
          <h1 className="mb-1 text-h2 text-text-primary">{title}</h1>
          <p className="mb-6 text-body-sm text-text-secondary">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
