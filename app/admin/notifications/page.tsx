import { SendNotificationForm } from "@/components/admin/SendNotificationForm";
import { getT } from "@/lib/i18n/server";

export default async function AdminNotificationsPage() {
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Kirim Notifikasi")}</h1>
        <p className="text-body-sm text-text-secondary">{t("Kirim pengumuman ke semua user atau user tertentu.")}</p>
      </div>

      <SendNotificationForm />
    </main>
  );
}
