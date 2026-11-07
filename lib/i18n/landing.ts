import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/dictionary";

// Terjemahan landing page: kunci = teks Inggris di komponen, nilai = versi Indonesia.
// Teks yang tidak ada di sini tampil apa adanya (Inggris). Bahasa bawaan situs adalah Indonesia,
// dan pengunjung bisa mengganti ke Inggris lewat tombol ID | EN di navbar.
const ID: Record<string, string> = {
  // Navbar
  Features: "Fitur",
  Pricing: "Harga",
  "Track Record": "Track Record",
  News: "Berita",
  "Sign in": "Masuk",
  "Get Started Free": "Mulai Gratis",

  // Hero
  "TRADING JOURNAL & MARKET NEWS": "JURNAL TRADING & BERITA PASAR",
  "Log every trade.": "Catat setiap trade.",
  "Read every market": "Baca setiap pergerakan",
  "move.": "pasar.",
  "Loki4x Academy keeps your entries, exits and reasoning in one disciplined journal, next to the economic releases that actually move price.":
    "Loki4x Academy menyimpan entry, exit, dan alasan trading-mu dalam satu jurnal yang disiplin, berdampingan dengan rilis ekonomi yang benar-benar menggerakkan harga.",
  "See how it works": "Lihat cara kerjanya",
  "Trade Journal": "Jurnal Trading",
  "Signals & Track Record": "Sinyal & Track Record",
  "Economic Calendar": "Kalender Ekonomi",
  "COT Positioning": "Posisi COT",
  "Lot Calculator": "Kalkulator Lot",
  "One workspace for everything you need to trade with discipline": "Satu tempat untuk semua yang kamu butuhkan agar trading lebih disiplin",

  // Features
  Sample: "Contoh",
  Balance: "Saldo",
  "Risk %": "Risiko %",
  "Stop loss": "Stop loss",
  "Lot size": "Ukuran lot",
  "Journal, signals, news, and positioning in one workspace, built for traders who want to see the whole picture.":
    "Jurnal, sinyal, berita, dan posisi pasar dalam satu tempat, dibuat untuk trader yang ingin melihat gambaran besarnya.",
  "The Toolkit Every Modern": "Perangkat Lengkap untuk",
  "Needs": "Modern",
  "Log every entry and exit in seconds. Win rate, risk-reward, and running P&L update automatically.":
    "Catat setiap entry dan exit dalam hitungan detik. Win rate, risk-reward, dan P&L berjalan terhitung otomatis.",
  "Real-Time Economic Calendar": "Kalender Ekonomi Real-Time",
  "High-impact releases flagged by importance and currency, so no news catches you off guard.":
    "Rilis berdampak tinggi ditandai berdasarkan tingkat kepentingan dan mata uang, jadi tidak ada berita yang membuatmu lengah.",
  "Curated trade signals with a transparent record of every closed result.":
    "Sinyal trading pilihan dengan rekam jejak transparan dari setiap hasil yang sudah ditutup.",
  "Institutional Positioning": "Posisi Institusional",
  "See how large players are positioned using official CFTC COT data.": "Lihat posisi pemain besar lewat data resmi CFTC COT.",
  "Position size, risk exposure, and potential profit before every trade.":
    "Ukuran posisi, eksposur risiko, dan potensi profit sebelum setiap trade.",
  "Learn while you trade": "Belajar sambil trading",
  "Lessons on technical analysis, fundamentals, and trading psychology, right next to your journal.":
    "Materi analisis teknikal, fundamental, dan psikologi trading, tepat di samping jurnalmu.",
  "Sentiment at a glance": "Sentimen sekilas pandang",
  "Retail bias and fundamentals alongside price, so you see where the crowd stands before you enter.":
    "Bias ritel dan fundamental berdampingan dengan harga, jadi kamu tahu posisi mayoritas sebelum entry.",
  "Your journal stays yours": "Jurnalmu tetap milikmu",
  "Your trades are visible only to you. Nothing you log is shared or published.":
    "Trade-mu hanya terlihat olehmu. Tidak ada yang kamu catat yang dibagikan atau dipublikasikan.",

  // Track record
  "Every Signal,": "Setiap Sinyal,",
  "Fully Transparent": "Sepenuhnya Transparan",

  // Pricing
  "Start free. Upgrade when your journal outgrows the basics.": "Mulai gratis. Upgrade saat jurnalmu butuh lebih dari dasar.",
  "Simple pricing,": "Harga sederhana,",
  "no surprises": "tanpa kejutan",
  "For traders getting their journal habit started.": "Untuk trader yang baru membangun kebiasaan menjurnal.",
  forever: "selamanya",
  "Dashboard overview": "Ringkasan dashboard",
  "Unlock signals and institutional COT positioning data.": "Buka sinyal dan data posisi institusional COT.",
  "/ month": "/ bulan",
  "Everything in Free": "Semua di Free",
  "Institutional Positioning (COT)": "Posisi Institusional (COT)",
  "Or join free via IB partner broker": "Atau gabung gratis lewat broker partner IB",
  "Get VIP": "Pilih VIP",
  "Full access for serious, active traders.": "Akses penuh untuk trader aktif yang serius.",
  "Everything in VIP": "Semua di VIP",
  "Unlimited Trade Journal": "Jurnal Trading tanpa batas",
  "Full Reports & Performance": "Laporan & Performa lengkap",
  "Full Academy access": "Akses penuh Academy",
  "Get Membership": "Pilih Membership",
  "Most Popular": "Paling Populer",
  "Or pay once — $70 for lifetime access, no monthly renewal.": "Atau bayar sekali — $70 untuk akses seumur hidup, tanpa perpanjangan bulanan.",

  // CTA
  "Start Trading": "Mulai Trading",
  Smarter: "Lebih Cerdas",
  Today: "Hari Ini",
  "Start your journal for free. It takes less than two minutes to log your first trade.":
    "Mulai jurnalmu gratis. Mencatat trade pertama hanya butuh kurang dari dua menit.",
  "View pricing": "Lihat harga",

  // Footer
  "A focused trading journal and market news workspace, built for traders who take their process seriously.":
    "Jurnal trading dan ruang kerja berita pasar yang fokus, dibuat untuk trader yang serius dengan prosesnya.",
  Legal: "Legal",
  "Privacy Policy": "Kebijakan Privasi",
  "Terms of Service": "Syarat & Ketentuan",
  Social: "Sosial",
  "© 2026 Loki4x Academy. All rights reserved.": "© 2026 Loki4x Academy. Hak cipta dilindungi.",

  // Unduh aplikasi
  "Get the app": "Unduh aplikasi",
  "Loki4x Academy on your phone": "Loki4x Academy di ponselmu",
  "Open the journal full screen from your home screen, and get signal alerts as push notifications.":
    "Buka jurnal layar penuh dari layar utama, dan terima peringatan sinyal sebagai notifikasi push.",
  "Download for Android (APK)": "Unduh untuk Android (APK)",
  "When Android asks, allow “Install unknown apps” for your browser, then open the downloaded file.":
    "Saat Android meminta, izinkan “Pasang aplikasi tidak dikenal” untuk browsermu, lalu buka file yang diunduh.",
  "iPhone: add to Home Screen": "iPhone: tambahkan ke Layar Utama",
  "In Safari, open": "Di Safari, buka",
  Tap: "Ketuk",
  Share: "Bagikan",
  "choose": "pilih",
  "Add to Home Screen": "Tambah ke Layar Utama",
  "then tap": "lalu ketuk",
  Add: "Tambah",
  "Open the Loki4x icon on your Home Screen (not Safari).": "Buka ikon Loki4x di Layar Utama (bukan Safari).",
  "For push notifications, go to Settings → Notifications and turn on push on this device (iOS 16.4 or later).":
    "Untuk notifikasi push, buka Pengaturan → Notifikasi lalu aktifkan push di perangkat ini (iOS 16.4 atau lebih baru).",
};

export type LandingT = (text: string) => string;

export function landingT(locale: Locale): LandingT {
  return (text) => (locale === "id" ? ID[text] ?? text : text);
}

/** Penerjemah landing page untuk komponen server, mengikuti cookie bahasa (bawaan: Indonesia). */
export async function getLandingT(): Promise<{ l: LandingT; locale: Locale }> {
  const locale = await getLocale();
  return { l: landingT(locale), locale };
}
