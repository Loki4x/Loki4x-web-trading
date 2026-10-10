"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-caption font-semibold uppercase tracking-widest text-error">Error</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-body-lg text-text-secondary">
        An unexpected error occurred. You can try again, or head back to the home page.
      </p>
      {error.digest && <p className="mt-3 text-caption text-text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Back to home
        </Link>
      </div>
    </main>
  );
}
