import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login } from "@/app/(auth)/actions";
import { getT } from "@/lib/i18n/server";
import { authErrorKey } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; confirmEmail?: string };
}) {
  const { t } = await getT();
  const errorKey = authErrorKey(searchParams.error);
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to keep your trading journal up to date.">
      <GoogleButton />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-caption text-text-muted">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {searchParams.confirmEmail && (
        <p className="mb-4 rounded-lg bg-success-subtle px-4 py-3 text-body-sm text-success">
          Check your inbox to confirm your email before signing in.
        </p>
      )}
      {errorKey && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
          {t(errorKey)}
        </p>
      )}

      <form action={login} className="flex flex-col gap-4">
        <Input id="email" name="email" type="email" label="Email" placeholder="you@example.com" required />
        <Input id="password" name="password" type="password" label="Password" placeholder="••••••••" required />
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-body-sm font-medium text-primary hover:text-primary-hover">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" withArrow className="mt-2 w-full justify-center">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
