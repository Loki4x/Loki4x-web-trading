"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addAcademyVideo } from "@/app/admin/actions";

export function AddVideoModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addAcademyVideo(formData);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Add Video</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Category</label>
            <select name="category" required className="input-field" defaultValue="TECHNICAL">
              <option value="TECHNICAL">Belajar Teknikal</option>
              <option value="FUNDAMENTAL">Fundamental Forex</option>
              <option value="PSYCHOLOGY">Psikologi & Risk</option>
            </select>
          </div>

          <Input name="title" label="Judul Video" placeholder="Cara Membaca Candlestick" required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Deskripsi (opsional)</label>
            <textarea name="description" rows={2} className="input-field resize-none" placeholder="Ringkasan singkat isi video..." />
          </div>

          <Input
            name="thumbnail_url"
            label="URL Thumbnail (gambar)"
            placeholder="https://..."
            required
          />
          <p className="-mt-2 text-caption text-text-muted">
            Bisa upload gambar ke Google Drive/ImgBB, lalu copy link gambarnya di sini.
          </p>

          <Input
            name="video_url"
            label="URL Video (Google Drive / YouTube / lainnya)"
            placeholder="https://..."
            required
          />

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Add Video
          </Button>
        </form>
      </div>
    </div>
  );
}
