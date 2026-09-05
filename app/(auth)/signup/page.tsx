import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signup } from "@/app/(auth)/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthCard title="Create your account" subtitle="Start logging trades and tracking market news today.">
      <GoogleButton />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-caption text-text-muted">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {searchParams.error && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
          {searchParams.error}
        </p>
      )}

      <form action={signup} className="flex flex-col gap-4">
        <Input id="fullName" name="fullName" type="text" label="Full Name" placeholder="Jane Trader" required />
        <Input id="email" name="email" type="email" label="Email" placeholder="you@example.com" required />
        <Input id="password" name="password" type="password" label="Password" placeholder="••••••••" required minLength={6} />
        <Button type="submit" withArrow className="mt-2 w-full justify-center">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
