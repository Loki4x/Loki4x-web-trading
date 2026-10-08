import type { TKey } from "@/lib/i18n/dictionary";

// Kode error yang boleh muncul di URL (?error=...). Halaman hanya menampilkan pesan tetap
// untuk kode ini; teks sembarang dari URL tidak pernah ditampilkan.
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "suspended"
  | "rate_limited"
  | "weak_password"
  | "mismatch"
  | "invalid_code"
  | "invalid_input"
  | "signup_failed"
  | "reset_expired"
  | "generic";

const KEY: Record<AuthErrorCode, TKey> = {
  invalid_credentials: "auth.err.invalid_credentials",
  email_not_confirmed: "auth.err.email_not_confirmed",
  suspended: "auth.err.suspended",
  rate_limited: "auth.err.rate_limited",
  weak_password: "auth.err.weak_password",
  mismatch: "auth.err.mismatch",
  invalid_code: "auth.err.invalid_code",
  invalid_input: "auth.err.invalid_input",
  signup_failed: "auth.err.signup_failed",
  reset_expired: "auth.err.reset_expired",
  generic: "auth.err.generic",
};

/** Kunci terjemahan untuk kode di URL. Kode asing -> pesan generik, bukan teks mentah. */
export function authErrorKey(code: string | undefined | null): TKey | null {
  if (!code) return null;
  return Object.prototype.hasOwnProperty.call(KEY, code) ? KEY[code as AuthErrorCode] : KEY.generic;
}

type SupabaseAuthError = { message?: string; code?: string; status?: number } | null | undefined;

export function classifyAuthError(
  error: SupabaseAuthError,
  ctx: "login" | "signup" | "otp" | "resend" | "reset" = "login"
): AuthErrorCode {
  const code = (error?.code ?? "").toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();

  if (error?.status === 429 || code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many")) {
    return "rate_limited";
  }
  if (code === "user_banned" || msg.includes("banned")) return "suspended";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "invalid_credentials";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "email_not_confirmed";
  if (code === "weak_password" || msg.includes("password should") || msg.includes("weak password")) return "weak_password";
  if (ctx === "otp") return "invalid_code";
  if (ctx === "signup") return "signup_failed";
  return "generic";
}
