"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logLoginActivity } from "@/lib/login-activity";
import { rateLimit } from "@/lib/rate-limit";
import { attachReferralFromCookie } from "@/lib/referral";
import { classifyAuthError } from "@/lib/auth-errors";
import { cleanText, isEmail } from "@/lib/validation";
import { SITE_URL } from "@/lib/site-url";

async function currentRequestInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

// Pesan error TIDAK dikirim lewat URL sebagai teks. Hanya kode tetap (lihat lib/auth-errors.ts),
// supaya pesan mentah dari Supabase tidak bocor dan link palsu tidak bisa menampilkan teks sembarang.

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isEmail(email) || password.length === 0 || password.length > 200) {
    redirect("/login?error=invalid_credentials");
  }

  const { ip: loginIp } = await currentRequestInfo();
  const okLogin =
    (await rateLimit(`login:ip:${loginIp ?? "unknown"}`, 20, 600)) &&
    (await rateLimit(`login:email:${email.toLowerCase()}`, 8, 600));
  if (!okLogin) {
    redirect("/login?error=rate_limited");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = classifyAuthError(error, "login");
    if (code === "email_not_confirmed") {
      redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=email_not_confirmed`);
    }
    redirect(`/login?error=${code}`);
  }

  if (data.user) {
    await logLoginActivity(supabase, data.user.id, await currentRequestInfo());
    // Akun baru yang datang lewat link undangan (/r/KODE): hubungkan ke pengundang.
    await attachReferralFromCookie({ id: data.user.id, created_at: data.user.created_at });
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = cleanText(formData.get("fullName"), 80);

  const { ip: signupIp } = await currentRequestInfo();
  if (!(await rateLimit(`signup:ip:${signupIp ?? "unknown"}`, 10, 3600))) {
    redirect("/signup?error=rate_limited");
  }

  if (!isEmail(email)) redirect("/signup?error=invalid_input");
  if (password.length < 8 || password.length > 72) redirect("/signup?error=weak_password");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    redirect(`/signup?error=${classifyAuthError(error, "signup")}`);
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  const { ip: verifyIp } = await currentRequestInfo();
  const okVerify =
    (await rateLimit(`verify:ip:${verifyIp ?? "unknown"}`, 20, 600)) &&
    (await rateLimit(`verify:email:${email.toLowerCase()}`, 8, 600));
  if (!okVerify) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=rate_limited`);
  }

  if (!isEmail(email) || !/^\d{6,8}$/.test(token)) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=invalid_code`);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=${classifyAuthError(error, "otp")}`);
  }

  if (data.user) {
    await logLoginActivity(supabase, data.user.id, await currentRequestInfo());
  }

  redirect("/dashboard");
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();

  const { ip: resendIp } = await currentRequestInfo();
  const okResend =
    (await rateLimit(`otp:email:${email.toLowerCase()}`, 3, 600)) &&
    (await rateLimit(`otp:ip:${resendIp ?? "unknown"}`, 10, 600));
  if (!okResend) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=rate_limited`);
  }

  if (!isEmail(email)) redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=invalid_input`);

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=${classifyAuthError(error, "resend")}`);
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}&resent=1`);
}

/**
 * Lupa password. Respons SELALU sama, apa pun hasilnya, supaya form ini tidak bisa dipakai
 * untuk menebak email mana yang terdaftar.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const { ip } = await currentRequestInfo();
  const ok =
    (await rateLimit(`reset:ip:${ip ?? "unknown"}`, 10, 3600)) &&
    (await rateLimit(`reset:email:${email}`, 3, 3600));
  if (!ok) redirect("/forgot-password?error=rate_limited");

  if (isEmail(email)) {
    const supabase = await createClient();
    // Error sengaja diabaikan (lihat catatan di atas).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    });
  }

  redirect("/forgot-password?sent=1");
}

/** Dipanggil dari halaman /reset-password; user sudah punya sesi pemulihan dari link di email. */
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=reset_expired");

  if (!(await rateLimit(`reset-update:${user.id}`, 5, 3600))) {
    redirect("/reset-password?error=rate_limited");
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || password.length > 72) redirect("/reset-password?error=weak_password");
  if (password !== confirm) redirect("/reset-password?error=mismatch");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${classifyAuthError(error, "reset")}`);
  }

  // Putuskan sesi di perangkat lain, siapa tahu password lama sudah bocor.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/dashboard");
}
