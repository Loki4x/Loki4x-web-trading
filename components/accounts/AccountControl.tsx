"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createAccount } from "@/app/(dashboard)/accounts/actions";

export function AddAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<"USD" | "IDR">("USD");

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
          <h2 className="text-h3 text-text-primary">Tambah Akun Journaling</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="name" label="Nama Akun" placeholder="Contoh: Akun Live, Akun Demo, FTMO 100K" required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Mata Uang</label>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "IDR")}
              className="input-field"
            >
              <option value="USD">USD ($)</option>
              <option value="IDR">IDR (Rp)</option>
            </select>
          </div>

          <Input
            name="initial_balance"
            type="number"
            step={currency === "IDR" ? "1000" : "0.01"}
            label={`Balance Awal (${currency === "IDR" ? "Rp" : "$"})`}
            placeholder={currency === "IDR" ? "150000000" : "10000"}
            defaultValue={currency === "IDR" ? "150000000" : "10000"}
            required
          />

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Buat Akun
          </Button>
        </form>
      </div>
    </div>
  );
}
