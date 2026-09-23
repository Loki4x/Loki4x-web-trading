"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logLoginActivity } from "@/lib/login-activity";

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await logLoginActivity(supabase, data.user.id, await currentRequestInfo());
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

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

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}&resent=1`);
}
