"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
