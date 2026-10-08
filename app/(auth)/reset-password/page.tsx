import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updatePassword } from "@/app/(auth)/actions";
import { getT } from "@/lib/i18n/server";
import { authErrorKey } from "@/lib/auth-errors";

export default async function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const { t } = await getT();
  const errorKey = authErrorKey(searchParams.error);

  return (
    <AuthCard title="Set a new password" subtitle="Choose a new password for your account (at least 8 characters).">
      {errorKey && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">{t(errorKey)}</p>
      )}

      <form action={updatePassword} className="flex flex-col gap-4">
        <Input id="password" name="password" type="password" label="New password" placeholder="••••••••" minLength={8} maxLength={72} required />
        <Input id="confirm" name="confirm" type="password" label="Confirm new password" placeholder="••••••••" minLength={8} maxLength={72} required />
        <Button type="submit" withArrow className="mt-2 w-full justify-center">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-text-secondary">
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
