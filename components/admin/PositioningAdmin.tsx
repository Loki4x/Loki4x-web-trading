"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { upsertPositioning, deletePositioning } from "@/app/admin/actions";
import type { Positioning } from "@/lib/types";

export function PositioningAdmin({ items }: { items: Positioning[] }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await upsertPositioning(formData);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data positioning ini?")) return;
    await deletePositioning(id);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-1">
        <h3 className="mb-4 text-body font-semibold text-text-primary">Tambah / Update Simbol</h3>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="symbol" label="Symbol" placeholder="EURUSD" required />
          <Input
            name="long_percent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            label="Long (%)"
            placeholder="e.g. 65"
            required
          />
          <p className="text-caption text-text-muted">
            Short otomatis dihitung: 100% dikurangi Long%. Kalau symbol sudah ada, datanya akan diupdate.
          </p>
          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Simpan
          </Button>
        </form>
      </div>

      <div className="card lg:col-span-2 !p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Symbol", "Long %", "Short %", "Updated", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  Belum ada data positioning.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{p.symbol}</td>
                <td className="px-4 py-3 text-body-sm text-success">{p.long_percent}%</td>
                <td className="px-4 py-3 text-body-sm text-error">{p.short_percent}%</td>
                <td className="px-4 py-3 text-caption text-text-muted">
                  {new Date(p.updated_at).toLocaleDateString("id-ID")}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(p.id)} className="text-text-muted hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
