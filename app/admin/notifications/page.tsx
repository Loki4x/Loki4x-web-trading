import { SendNotificationForm } from "@/components/admin/SendNotificationForm";

export default function AdminNotificationsPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Kirim Notifikasi</h1>
        <p className="text-body-sm text-text-secondary">Kirim pengumuman ke semua user atau user tertentu.</p>
      </div>

      <SendNotificationForm />
    </main>
  );
}
