"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildPakasirCheckoutUrl, PLAN_PRICE_IDR } from "@/lib/pakasir";

export async function submitVipRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const brokerEmail = String(formData.get("broker_email") ?? "");
  const tradingAccountId = String(formData.get("trading_account_id") ?? "");
  const firstDeposit = Number(formData.get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) {
    throw new Error("Semua kolom wajib diisi");
  }

  if (firstDeposit < 15) {
    throw new Error("Deposit pertama minimal $15");
  }

  await supabase.from("vip_ib_requests").insert({
    user_id: user.id,
    broker_email: brokerEmail,
    trading_account_id: tradingAccountId,
    first_deposit: firstDeposit,
    status: "PENDING",
  });

  revalidatePath("/upgrade");
}

export async function createPakasirPayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const plan = String(formData.get("plan"));
  if (plan !== "VIP" && plan !== "MEMBERSHIP") {
    throw new Error("Paket tidak valid");
  }

  const amount = PLAN_PRICE_IDR[plan];
  const orderId = `LOKI4X-${user.id.slice(0, 8)}-${Date.now()}`;

  // Pakai service client: insert order sebelum user diarahkan keluar,
  // nggak perlu nunggu RLS session yang mungkin ke-drop pas redirect.
  const service = createServiceClient();
  const { error } = await service.from("payments").insert({
    user_id: user.id,
    order_id: orderId,
    plan,
    amount,
    status: "PENDING",
  });

  if (error) throw new Error("Gagal membuat order pembayaran");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://4xcomunity.my.id";
  const checkoutUrl = buildPakasirCheckoutUrl({
    amount,
    orderId,
    redirectUrl: `${siteUrl}/upgrade?paid=1`,
  });

  redirect(checkoutUrl);
}
