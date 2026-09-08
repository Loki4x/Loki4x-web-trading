"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addNewsEvent } from "@/app/admin/actions";

export function AddNewsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addNewsEvent(formData);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Add News Event</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="event_title" label="Event Title" placeholder="Non-Farm Payrolls" required />

          <div className="grid grid-cols-2 gap-4">
            <Input name="currency" label="Currency" placeholder="USD" required />
            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">Impact</label>
              <select name="impact_level" required className="input-field" defaultValue="MEDIUM">
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <Input name="release_time" type="datetime-local" label="Release Time" required />

          <div className="grid grid-cols-3 gap-3">
            <Input name="forecast" label="Forecast (opsional)" />
            <Input name="previous" label="Previous (opsional)" />
            <Input name="actual" label="Actual (opsional)" />
          </div>

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Add Event
          </Button>
        </form>
      </div>
    </div>
  );
}
