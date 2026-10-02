"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createAccount } from "@/app/(dashboard)/accounts/actions";
import { useT } from "@/lib/i18n/client";

export function AddAccountModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await createAccount(formData);
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      alert(result.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{t("Tambah Akun Journaling")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="name" label={t("Nama Akun")} placeholder={t("Contoh: Akun Live, Akun Demo, FTMO 100K")} required />
          <Input
            name="initial_balance"
            type="number"
            step="0.01"
            label={t("Balance Awal ($)")}
            placeholder="10000"
            defaultValue="10000"
            required
          />

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            {t("Buat Akun")}
          </Button>
        </form>
      </div>
    </div>
  );
}
