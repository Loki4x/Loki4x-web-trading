import { AuthCard } from "@/components/auth/AuthCard";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { verifyOtp, resendOtp } from "@/app/(auth)/actions";

export default function VerifyOtpPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string; resent?: string };
}) {
  const email = searchParams.email ?? "";

  return (
    <AuthCard
      title="Verifikasi email kamu"
      subtitle={`Kami sudah kirim kode 6 digit ke ${email || "email kamu"}.`}
    >
      {searchParams.error && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
          {searchParams.error}
        </p>
      )}

      {searchParams.resent && (
        <p className="mb-4 rounded-lg bg-primary-subtle px-4 py-3 text-body-sm text-primary">
          Kode baru sudah dikirim ulang.
        </p>
      )}

      <form action={verifyOtp} className="flex flex-col gap-6">
        <input type="hidden" name="email" value={email} />
        <OtpInput />
        <Button type="submit" withArrow className="w-full justify-center">
          Verifikasi
        </Button>
      </form>

      <form action={resendOtp} className="mt-4 text-center">
        <input type="hidden" name="email" value={email} />
        <button type="submit" className="text-body-sm font-medium text-primary hover:text-primary-hover">
          Kirim ulang kode
        </button>
      </form>
    </AuthCard>
  );
}
