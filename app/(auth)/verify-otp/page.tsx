import { AuthCard } from "@/components/auth/AuthCard";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { verifyOtp, resendOtp } from "@/app/(auth)/actions";
import { getT } from "@/lib/i18n/server";
import { authErrorKey } from "@/lib/auth-errors";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string; resent?: string };
}) {
  const { t: tAuth } = await getT();
  const errorKey = authErrorKey(searchParams.error);
  const { t } = await getT();
  const email = searchParams.email ?? "";

  return (
    <AuthCard
      title={t("Verifikasi email kamu")}
      subtitle={t("Kami sudah kirim kode 6 digit ke {email}.", { email: email || t("email kamu") })}
    >
      {errorKey && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
          {tAuth(errorKey)}
        </p>
      )}

      {searchParams.resent && (
        <p className="mb-4 rounded-lg bg-primary-subtle px-4 py-3 text-body-sm text-primary">
          {t("Kode baru sudah dikirim ulang.")}
        </p>
      )}

      <form action={verifyOtp} className="flex flex-col gap-6">
        <input type="hidden" name="email" value={email} />
        <OtpInput />
        <Button type="submit" withArrow className="w-full justify-center">
          {t("Verifikasi")}
        </Button>
      </form>

      <form action={resendOtp} className="mt-4 text-center">
        <input type="hidden" name="email" value={email} />
        <button type="submit" className="text-body-sm font-medium text-primary hover:text-primary-hover">
          {t("Kirim ulang kode")}
        </button>
      </form>
    </AuthCard>
  );
}
