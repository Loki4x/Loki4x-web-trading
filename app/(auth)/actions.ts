"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logLoginActivity } from "@/lib/login-activity";
import { rateLimit } from "@/lib/rate-limit";
import { attachReferralFromCookie } from "@/lib/referral";
import { getT } from "@/lib/i18n/server";

async function currentRequestInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { ip: loginIp } = await currentRequestInfo();
  const okLogin =
    (await rateLimit(`login:ip:${loginIp ?? "unknown"}`, 20, 600)) &&
    (await rateLimit(`login:email:${email.toLowerCase()}`, 8, 600));
  if (!okLogin) {
    const { t } = await getT();
    redirect(`/login?error=${encodeURIComponent(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."))}`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  const { ip: signupIp } = await currentRequestInfo();
  if (!(await rateLimit(`signup:ip:${signupIp ?? "unknown"}`, 10, 3600))) {
    const { t } = await getT();
    redirect(`/signup?error=${encodeURIComponent(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."))}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");

  const { ip: verifyIp } = await currentRequestInfo();
  const okVerify =
    (await rateLimit(`verify:ip:${verifyIp ?? "unknown"}`, 20, 600)) &&
    (await rateLimit(`verify:email:${email.toLowerCase()}`, 8, 600));
  if (!okVerify) {
    const { t } = await getT();
    redirect(
      `/verify-otp?email=${encodeURIComponent(email)}&error=${encodeURIComponent(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."))}`
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await logLoginActivity(supabase, data.user.id, await currentRequestInfo());
  }

  redirect("/dashboard");
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");

  const { ip: resendIp } = await currentRequestInfo();
  const okResend =
    (await rateLimit(`otp:email:${email.toLowerCase()}`, 3, 600)) &&
    (await rateLimit(`otp:ip:${resendIp ?? "unknown"}`, 10, 600));
  if (!okResend) {
    const { t } = await getT();
    redirect(
      `/verify-otp?email=${encodeURIComponent(email)}&error=${encodeURIComponent(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."))}`
    );
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}&resent=1`);
}
