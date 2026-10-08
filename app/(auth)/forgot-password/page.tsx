import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { getT } from "@/lib/i18n/server";
import { authErrorKey } from "@/lib/auth-errors";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  const { t } = await getT();
  const errorKey = authErrorKey(searchParams.error);

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a link to set a new password.">
      {searchParams.sent && (
        <p className="mb-4 rounded-lg bg-success-subtle px-4 py-3 text-body-sm text-success">{t("auth.reset.sent")}</p>
      )}
      {errorKey && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">{t(errorKey)}</p>
      )}

      <form action={requestPasswordReset} className="flex flex-col gap-4">
        <Input id="email" name="email" type="email" label="Email" placeholder="you@example.com" required />
        <Button type="submit" withArrow className="mt-2 w-full justify-center">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-text-secondary">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
