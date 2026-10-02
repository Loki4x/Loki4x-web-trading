import { getT } from "@/lib/i18n/server";
export async function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  const { t } = await getT();
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen w-full items-center justify-center bg-background"
          : "flex min-h-[60vh] w-full items-center justify-center"
      }
    >
      <div className="dots-loader" role="status" aria-label={t("Memuat...")}>
        <span className="sr-only">{t("Memuat...")}</span>
      </div>
    </div>
  );
}
