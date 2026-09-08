"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { NewsImpactBadge } from "@/components/news/NewsImpactBadge";
import { AddNewsModal } from "@/components/admin/AddNewsModal";
import { formatDate, formatTime } from "@/lib/utils";
import { deleteNewsEvent } from "@/app/admin/actions";
import type { NewsEvent } from "@/lib/types";

export function NewsAdminTable({ events }: { events: NewsEvent[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Hapus event berita ini?")) return;
    await deleteNewsEvent(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
          <Plus className="h-4 w-4" />
          Add News Event
        </button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Event", "Currency", "Impact", "Date", "Time", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  Belum ada event berita.
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{e.event_title}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{e.currency}</td>
                <td className="px-4 py-3">
                  <NewsImpactBadge impact={e.impact_level} />
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(e.release_time)}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatTime(e.release_time)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(e.id)} className="text-text-muted hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && <AddNewsModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
