import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-caption font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-body-lg text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
