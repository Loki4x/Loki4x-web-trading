"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { AddVideoModal } from "@/components/admin/AddVideoModal";
import { deleteAcademyVideo } from "@/app/admin/actions";
import type { AcademyVideo } from "@/components/academy/VideoGrid";

interface AdminVideo extends AcademyVideo {
  category: string;
}

const categoryLabel: Record<string, string> = {
  TECHNICAL: "Teknikal",
  FUNDAMENTAL: "Fundamental",
  PSYCHOLOGY: "Psikologi",
};

export function AcademyAdminTable({ videos }: { videos: AdminVideo[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Hapus video ini?")) return;
    await deleteAcademyVideo(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
          <Plus className="h-4 w-4" />
          Add Video
        </button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Thumbnail", "Title", "Category", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  Belum ada video.
                </td>
              </tr>
            )}
            {videos.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail_url} alt={v.title} className="h-12 w-20 rounded-md object-cover" />
                </td>
                <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{v.title}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{categoryLabel[v.category] ?? v.category}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(v.id)} className="text-text-muted hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && <AddVideoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
