import { NextResponse } from "next/server";
import { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/referral-config";

// Link undangan: https://domainmu/r/KODE
// Menyimpan kode di cookie (30 hari), lalu mengarahkan ke halaman daftar.
// Kodenya baru dihubungkan ke akun saat pendaftaran selesai (verifikasi OTP / login Google).
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const response = NextResponse.redirect(new URL("/signup", request.url));
  const code = String(params.code ?? "").toUpperCase();

  if (REFERRAL_CODE_PATTERN.test(code)) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return response;
}
