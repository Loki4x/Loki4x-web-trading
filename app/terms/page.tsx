import { SUPPORT_EMAIL } from "@/lib/site-url";

// [judul, isi]
const PAID_TERMS: [string, string][] = [
  ["Paket dan harga.", "VIP $20/bulan (Rp358.000), Membership $35/bulan (Rp627.000), dan Membership Lifetime $70 sekali bayar (Rp1.253.000). Harga rupiah mengikuti kurs yang berlaku di halaman pembayaran, dan kami berhak menyesuaikannya."],
  ["Masa aktif.", "Paket bulanan aktif 30 hari sejak pembayaran dikonfirmasi. Kalau kamu membayar saat masih aktif, 30 hari baru ditambahkan di belakang masa aktif yang tersisa."],
  ["Tidak ada perpanjangan otomatis.", "Kami tidak menarik pembayaran otomatis. Setelah masa aktif habis, akunmu kembali ke tier Free sampai kamu membayar lagi."],
  ["Lifetime.", "Akses Membership tanpa batas waktu selama layanan Loki4x Academy beroperasi. Lifetime berlaku untuk satu akun dan tidak bisa dipindahkan."],
  ["Metode pembayaran.", "QRIS dan transfer VA bank diproses otomatis lewat halaman pembayaran penyedia pembayaran kami. Biaya layanan dan biaya metode pembayaran ditambahkan di halaman tersebut dan ditanggung pembeli. USDT diverifikasi manual oleh admin, biasanya 1×24 jam kerja. Kirim jumlah, jaringan, dan alamat tujuan sesuai petunjuk di halaman pembayaran. Kesalahan jaringan atau jumlah transfer adalah tanggung jawab pengirim."],
  ["Aktivasi.", "Akses aktif setelah pembayaran terkonfirmasi. Kalau akses belum aktif lebih dari 1×24 jam, hubungi Live Chat dengan bukti pembayaran."],
  ["Kebijakan refund.", "Pembayaran yang sudah berhasil tidak dapat dikembalikan, karena akses digital langsung aktif. Pengecualian hanya untuk pembayaran ganda atau kesalahan sistem dari pihak kami."],
  ["Upgrade dan downgrade.", "Tier yang lebih tinggi yang sedang aktif tidak diturunkan oleh pembelian paket yang lebih rendah. Tidak ada pro-rata saat upgrade, jadi sisa masa aktif paket lama tidak dikonversi."],
  ["Penggunaan pribadi.", "Akses hanya untuk satu pemilik akun. Dilarang membagikan akun, menjual ulang, menyalin, atau menyebarkan sinyal, materi Academy, dan data COT di luar komunitas tanpa izin tertulis."],
  ["Pelanggaran.", "Pelanggaran seperti berbagi akun, penipuan pembayaran, atau penyalahgunaan layanan dapat membuat akun disuspend atau dicabut tanpa refund."],
  ["Ketersediaan layanan.", "Kami berusaha menjaga layanan berjalan stabil, tetapi tidak menjamin tanpa gangguan. Pemeliharaan, gangguan pihak ketiga (seperti hosting, payment gateway, atau penyedia data), dan keterlambatan data bisa terjadi."],
  ["Perubahan layanan.", "Fitur, harga, dan isi paket dapat berubah. Perubahan yang mengurangi fitur paket yang sedang aktif akan diumumkan lebih dulu lewat notifikasi di web."],
  ["Disclaimer risiko.", "Sinyal, analisis, dan materi edukasi bukan nasihat keuangan dan tidak menjamin profit. Trading forex, emas, dan kripto berisiko tinggi, dan semua keputusan serta kerugian menjadi tanggung jawab member."],
  ["Persetujuan dan perubahan.", "Dengan membeli, kamu menyatakan sudah membaca dan menyetujui ketentuan ini. Ketentuan dapat diperbarui, dan versi terbaru berlaku sejak diumumkan di web."],
];

const IB_TERMS: [string, string][] = [
  ["Akun trading harus aktif.", "Akun yang didaftarkan lewat link IB Loki4x Academy harus berstatus aktif dan terverifikasi (KYC selesai). Akun yang tidak aktif, ditutup, atau di-dormant oleh broker bisa membuat akses VIP dicabut."],
  ["Tidak boleh pindah IB.", "Setelah mendaftar, akun tidak boleh dipindahkan ke IB atau partner lain. Kalau terdeteksi pindah, akses VIP dihentikan tanpa pemberitahuan lebih dulu."],
  ["Akun baru lewat link resmi.", "Akun harus dibuat lewat link pendaftaran resmi kami. Akun yang sudah ada sebelumnya dan tidak terhubung ke IB kami tidak memenuhi syarat."],
  ["Data harus benar.", "Nomor akun, email, dan nama yang dikirim harus asli dan sesuai data di broker. Data palsu atau milik orang lain membuat pengajuan ditolak atau akses dicabut."],
  ["Satu akun trading untuk satu akun member.", "Akses VIP tidak boleh dibagikan, dijual, atau dipakai orang lain."],
  ["Aktivitas trading wajar.", "Akun tidak boleh dipakai untuk aktivitas yang melanggar aturan broker, seperti penyalahgunaan bonus, arbitrase, atau penipuan."],
  ["Verifikasi dan masa tunggu.", "Pengajuan diverifikasi manual oleh admin, biasanya 1×24 jam kerja. Admin berhak menolak pengajuan yang tidak memenuhi syarat."],
  ["Pemeriksaan berkala.", "Kami dapat memeriksa status akun secara berkala. Kalau syarat tidak terpenuhi lagi, VIP bisa dinonaktifkan dan dikembalikan ke tier Free."],
  ["Perubahan ketentuan.", "Kami dapat mengubah ketentuan ini kapan saja, dan perubahan diumumkan lewat notifikasi di web."],
  ["Disclaimer risiko.", "Konten dan sinyal bersifat edukasi dan bukan nasihat keuangan. Trading forex berisiko tinggi, dan semua keputusan serta kerugian menjadi tanggung jawab member."],
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-12">
      <h1 className="text-h2 text-text-primary">Terms of Service</h1>
      <p className="mt-2 text-body-sm text-text-muted">Last updated: Oktober 2026</p>

      <div className="mt-8 flex flex-col gap-8 text-body-sm text-text-secondary">
        <section>
          <h2 className="mb-2 text-h3 text-text-primary">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using Loki4x Academy, you agree to these Terms of Service. If you do
            not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">2. Description of Service</h2>
          <p>
            Loki4x Academy provides a trading journal, market news, economic calendar, and educational
            content for traders. It is a tool to help you track and review your own trading activity.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">3. Trading &amp; Financial Disclaimer</h2>
          <p>
            Nothing on this platform constitutes financial, investment, or trading advice. All signals,
            news, educational content, and calculators are provided for informational purposes only.
            Trading forex and other financial instruments carries substantial risk of loss and is not
            suitable for every investor. Past performance does not guarantee future results. You are solely
            responsible for your own trading decisions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">4. Account Registration</h2>
          <p>
            You must provide accurate information when creating an account and are responsible for keeping
            your login credentials secure. You are responsible for all activity under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">5. Acceptable Use</h2>
          <p>
            You agree not to misuse the platform, attempt to disrupt its operation, or use it for any
            unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">6. User Content</h2>
          <p>
            You retain ownership of the trade data, notes, and images you upload. By uploading content, you
            grant us permission to store and display it back to you as part of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">7. Termination</h2>
          <p>We may suspend or terminate accounts that violate these Terms or misuse the platform.</p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">8. Disclaimer &amp; Limitation of Liability</h2>
          <p>
            The platform is provided &quot;as is&quot; without warranties of any kind. We are not liable for
            any trading losses or damages arising from your use of the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use after changes means you accept the updated Terms.
            Sections 10 and 11 below are written in Bahasa Indonesia and apply to paid plans and VIP via IB.
          </p>
        </section>

        <section id="paket-berbayar" className="scroll-mt-24">
          <h2 className="mb-1 text-h3 text-text-primary">10. Ketentuan Paket Berbayar (VIP &amp; Membership)</h2>
          <p className="mb-3 text-text-muted">Berlaku untuk pembelian VIP, Membership, dan Membership Lifetime.</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {PAID_TERMS.map(([title, text]) => (
              <li key={title}>
                <strong className="text-text-primary">{title}</strong> {text}
              </li>
            ))}
          </ol>
        </section>

        <section id="vip-ib" className="scroll-mt-24">
          <h2 className="mb-1 text-h3 text-text-primary">11. Ketentuan VIP via IB</h2>
          <p className="mb-3 text-text-muted">Berlaku untuk akses VIP gratis lewat pendaftaran akun trading di broker partner kami.</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {IB_TERMS.map(([title, text]) => (
              <li key={title}>
                <strong className="text-text-primary">{title}</strong> {text}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">12. Contact Us</h2>
          <p>Questions about these Terms? Reach us at {SUPPORT_EMAIL}.</p>
        </section>
      </div>
    </main>
  );
}
