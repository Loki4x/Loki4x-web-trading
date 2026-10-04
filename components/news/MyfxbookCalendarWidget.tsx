// Widget kalender ekonomi resmi dari Myfxbook (kode embed dari myfxbook.com/get-widget/13/general_widgets).
// Atribusi "Economic Calendar by Myfxbook.com" di bawahnya JANGAN dihapus.

const WIDGET_URL = "https://widget.mfbcdn.net/widget/calendar.html";

// Pengaturan dari generator widget. Ubah di sini kalau mau.
// impacts: "0,1,2,3" = semua tingkat dampak (None, Low, Medium, High).
// Untuk hanya Medium + High coba "2,3" (urutan nilai ini dugaan, cek hasilnya di tampilan).
const IMPACTS = "0,1,2,3";
const SYMBOLS = "AUD,CAD,CHF,CNY,EUR,GBP,JPY,NZD,USD";

export function MyfxbookCalendarWidget({ lang = "en", title }: { lang?: string; title: string }) {
  const src = `${WIDGET_URL}?lang=${encodeURIComponent(lang)}&impacts=${IMPACTS}&symbols=${SYMBOLS}`;

  return (
    <div className="card overflow-hidden !p-0">
      <iframe
        title={title}
        src={src}
        loading="lazy"
        // sandbox: widget tetap jalan, tapi tidak bisa mengarahkan/menimpa halaman webmu.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        style={{ border: 0, width: "100%", height: "clamp(520px, 80vh, 820px)", display: "block", background: "#ffffff" }}
      />
      <div className="px-4 py-3 text-center text-caption text-text-muted">
        <a
          href="https://www.myfxbook.com/forex-economic-calendar?utm_source=widget13&utm_medium=link&utm_campaign=copyright"
          title="Economic Calendar"
          className="myfxbookLink"
          target="_blank"
          rel="noopener"
        >
          <b>Economic Calendar</b>
        </a>{" "}
        by Myfxbook.com
      </div>
    </div>
  );
}
