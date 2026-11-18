"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";
import { isUuid, ownedPhotoUrl } from "@/lib/validation";
import type { ImportRow } from "@/lib/trade-import";
import { getT } from "@/lib/i18n/server";
import {
  createTrade,
  deleteTradeCore,
  formGetter,
  importTradeRows,
  parseTradeFields,
  updateTradeCore,
} from "@/lib/journal-core";

// Logika jurnal (validasi, P&L, notifikasi batas risiko, import) ada di lib/journal-core.ts,
// dipakai bersama oleh aplikasi Android lewat /api/mobile/trades.

/**
 * Import trade hasil parsing file MT4/MT5/CSV (lib/trade-import.ts) ke satu akun.
 * Data dari klien divalidasi ulang. Trade dengan external_id yang sudah ada di akun itu dilewati.
 */
export async function importTrades(accountId: string, rows: ImportRow[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const { t } = await getT();
  const result = await importTradeRows(supabase, user.id, accountId, rows, t);
  if (result.success) {
    revalidatePath("/trades");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
  }
  return result;
}

export async function addTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fields = parseTradeFields(formGetter(formData));
  const accountId = String(formData.get("account_id") ?? "");
  if (!fields || !isUuid(accountId)) {
    console.warn("[trades] addTrade ditolak: input tidak valid");
    return;
  }

  async function uploadPhoto(field: string, label: string) {
    const file = formData.get(field) as File | null;
    return uploadToR2(file, `${user!.id}/${label}`);
  }
  const beforePhotoUrl = await uploadPhoto("before_photo", "before");
  const afterPhotoUrl = await uploadPhoto("after_photo", "after");

  const { t } = await getT();
  await createTrade(supabase, user.id, accountId, fields, t, {
    before_photo_url: beforePhotoUrl,
    after_photo_url: afterPhotoUrl,
  });

  revalidatePath("/trades");
  revalidatePath("/dashboard");
}

export async function updateTrade(tradeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fields = parseTradeFields(formGetter(formData));
  if (!isUuid(tradeId) || !fields) {
    console.warn("[trades] updateTrade ditolak: input tidak valid");
    return;
  }

  async function uploadPhotoIfProvided(field: string, label: string, existingUrl: string | null) {
    const file = formData.get(field) as File | null;
    if (!file || file.size === 0) return existingUrl;
    return uploadToR2(file, `${user!.id}/${label}`);
  }
  const beforePhotoUrl = await uploadPhotoIfProvided(
    "before_photo",
    "before",
    ownedPhotoUrl(String(formData.get("existing_before_photo_url") ?? "") || null, user.id)
  );
  const afterPhotoUrl = await uploadPhotoIfProvided(
    "after_photo",
    "after",
    ownedPhotoUrl(String(formData.get("existing_after_photo_url") ?? "") || null, user.id)
  );

  const { t } = await getT();
  await updateTradeCore(supabase, user.id, tradeId, fields, t, {
    before_photo_url: beforePhotoUrl,
    after_photo_url: afterPhotoUrl,
  });

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteTrade(tradeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await deleteTradeCore(supabase, user.id, tradeId);
  revalidatePath("/trades");
  revalidatePath("/dashboard");
}
