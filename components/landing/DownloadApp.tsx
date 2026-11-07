import { Download, Smartphone, ChevronDown } from "lucide-react";
import { getLandingT } from "@/lib/i18n/landing";

/** Unduh aplikasi: APK untuk Android, petunjuk "Add to Home Screen" untuk iPhone. Tampil di dasar landing page. */
export async function DownloadApp() {
  const { l } = await getLandingT();
  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" />
            <span className="text-caption font-semibold uppercase tracking-wide">{l("Get the app")}</span>
          </div>
          <h3 className="mt-2 text-h3 text-text-primary">{l("Loki4x Academy on your phone")}</h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            {l("Open the journal full screen from your home screen, and get signal alerts as push notifications.")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:max-w-sm">
          <a
            href="/downloads/loki4x-academy.apk"
            download
            className="btn-primary w-full justify-center"
          >
            <Download className="h-4 w-4" />
            {l("Download for Android (APK)")}
          </a>
          <p className="text-caption text-text-muted">
            {l("When Android asks, allow “Install unknown apps” for your browser, then open the downloaded file.")}
          </p>

          <details className="group rounded-lg border border-border bg-background px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-body-sm font-medium text-text-primary">
              {l("iPhone: add to Home Screen")}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body-sm text-text-secondary">
              <li>
                {l("In Safari, open")} <span className="text-text-primary">www.loki4xacademy.web.id</span>.
              </li>
              <li>
                {l("Tap")} <span className="text-text-primary">{l("Share")}</span>, {l("choose")}{" "}
                <span className="text-text-primary">{l("Add to Home Screen")}</span>, {l("then tap")}{" "}
                <span className="text-text-primary">{l("Add")}</span>.
              </li>
              <li>{l("Open the Loki4x icon on your Home Screen (not Safari).")}</li>
              <li>{l("For push notifications, go to Settings → Notifications and turn on push on this device (iOS 16.4 or later).")}</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
