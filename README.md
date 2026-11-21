# Loki4x Academy — Web

Platform edukasi & tools trading forex untuk member Loki4x Academy: sinyal trading, trading journal, akademi video + kuis, data pasar (COT, Retail Bias, kalender ekonomi, berita), komunitas, dan panel admin.

Repo ini juga menyediakan **API untuk aplikasi Android** ([Loki4x/Loki4x-apk](https://github.com/Loki4x/Loki4x-apk)) di `/api/mobile/...`, sehingga web dan aplikasi memakai data dan aturan yang sama.

🌐 Produksi: https://www.loki4xacademy.web.id

---

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur folder](#struktur-folder)
- [Menjalankan di lokal](#menjalankan-di-lokal)
- [Variabel lingkungan](#variabel-lingkungan)
- [Database (Supabase)](#database-supabase)
- [Tugas terjadwal (GitHub Actions)](#tugas-terjadwal-github-actions)
- [API aplikasi Android](#api-aplikasi-android)
- [Deploy](#deploy)
- [Catatan pengembangan](#catatan-pengembangan)

---

## Fitur

### Tier member

| Tier | Akses |
|---|---|
| **Free** | Dashboard, jam sesi pasar (kill zone ICT), kalender ekonomi, komunitas umum, chat admin |
| **VIP** | + Sinyal trading, COT, Retail Bias, ruang komunitas VIP |
| **Membership** | + Trading Journal, Report & Performance, Lot Calculator, Akademi (video + kuis), Fundamental Pasar, ruang komunitas Membership |

Masa aktif dihitung dari `vip_expires_at`; tier berbayar yang sudah lewat masa aktifnya otomatis dianggap Free (lihat `lib/membership.ts`).

### Member

- **Dashboard** — ringkasan trading akun aktif, kurva saldo, top pairs, panel disiplin, sorotan pasar (COT & Retail Bias), berita high impact, langkah awal, riwayat pembelian.
- **Sinyal** — sinyal Reguler & News dengan entry/TP/SL, update (SL ke BE, partial, dll), foto chart & hasil, statistik win rate & pips, notifikasi per pair.
- **Trading Journal** — beberapa akun, catat/edit trade + foto, strategi/emosi/kepatuhan rencana, aturan risiko & target harian, import statement MT4/MT5/CSV, export CSV.
- **Report & Performance** — kalender P&L harian, rekap bulanan, per pair/sesi/tag, gambar rekap untuk dibagikan.
- **Akademi** — video per kategori (Teknikal, Fundamental, Psikologi), progres tontonan, kuis dengan pembahasan.
- **Data pasar** — COT (CFTC), Retail Bias (Myfxbook + data manual), kalender ekonomi (dengan nilai Actual), berita Fundamental Pasar.
- **Komunitas** — ruang chat per tier + Pengumuman, foto, balas, mention, pin, laporan pesan.
- **Chat Admin** — live chat ke support dengan foto.
- **Upgrade & pembayaran** — QRIS / Virtual Account (Poketo), USDT (bukti transfer, verifikasi admin), VIP gratis via IB broker, kode promo.
- **Referral** — link undangan, hadiah hari VIP.
- **Notifikasi** — lonceng di web, Web Push, push aplikasi (FCM), dan email (Resend).
- **Pengaturan** — profil, preferensi notifikasi, bahasa (Indonesia/English), zona waktu, kata sandi, tampilan (Terang/Gelap/Sistem + gaya **Normal / Glassmorphism**).

### Admin (`/admin`)

Dashboard (signup, konversi, pendapatan, member yang segera berakhir) · Users (tier, masa aktif, suspend) · VIP Requests · Pembayaran USDT · Kode Promo · Referral · Sinyal · Akademi (video & soal kuis) · Economic News · Actual Berita · Positioning · Live Chat · Kirim Notifikasi · Audit Log.

Penolakan VIP request / pembayaran USDT bisa disertai alasan yang dikirim ke user lewat notifikasi, push, dan email. Semua aksi admin tercatat di `audit_logs`.

---

## Teknologi

- **Next.js 14** (App Router, Server Actions) + **React 18** + **TypeScript**
- **Tailwind CSS** dengan variabel warna tema (`app/globals.css`, `tailwind.config.ts`)
- **Supabase** — Auth (email + OTP, Google), Postgres dengan RLS, Realtime (chat)
- **Cloudflare R2** (S3 API) — foto sinyal, trade, chat, bukti transfer (bucket publik & privat)
- **Resend** — email transaksional & laporan
- **Poketo** — pembayaran QRIS / Virtual Account
- **Web Push (VAPID)** & **Firebase Cloud Messaging** — notifikasi browser & aplikasi Android
- **Recharts** — grafik
- **Vercel** — hosting

---

## Struktur folder

```
app/
  (auth)/          login, daftar, verifikasi OTP, lupa & reset password
  (dashboard)/     halaman member (dashboard, signals, trades, academy, cot, ...)
  admin/           panel admin + server actions admin
  api/
    mobile/        API untuk aplikasi Android (Bearer token Supabase)
    cron/          endpoint tugas terjadwal (dilindungi CRON_SECRET)
    poketo/        webhook pembayaran
    admin/, chat/, community/, share/   file privat & gambar rekap
  page.tsx         landing page
components/        komponen UI per fitur (dashboard, admin, trades, settings, ...)
lib/               logika bersama
  *-core.ts        inti aksi yang dipakai server action web DAN API mobile
  supabase/        klien Supabase (server, browser, service role, middleware)
  i18n/            kamus Indonesia/English
supabase/          file SQL (skema & migrasi)
scripts/           skrip Node untuk GitHub Actions
.github/workflows/ tugas terjadwal (cron) & backup database
```

**Pola penting:** logika bisnis ditulis sekali di `lib/*-core.ts` (mis. `admin-core.ts`, `admin-ops-core.ts`, `upgrade-core.ts`, `community-core.ts`), lalu dipanggil oleh server action web (`app/**/actions.ts`) dan oleh route `app/api/mobile/**`. Dengan begitu validasi, audit log, dan notifikasi selalu sama di web dan aplikasi.

---

## Menjalankan di lokal

Prasyarat: Node.js 18+ dan project Supabase.

```bash
npm install
```

```bash
cp .env.local.example .env.local
```

Isi `.env.local` (lihat bagian berikut), lalu:

```bash
npm run dev
```

Buka http://localhost:3000.

Perintah lain:

```bash
npm run build
```

```bash
npm run lint
```

---

## Variabel lingkungan

Isi di `.env.local` (lokal) dan di Vercel → Project → Settings → Environment Variables (produksi).
**Jangan pernah commit nilai rahasia ke repo.**

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Publishable / anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server saja — **rahasia**) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Domain situs, dipakai di link email & redirect (lokal: `http://localhost:3000`) |
| `RESEND_API_KEY` | ✅ | Kirim email |
| `EMAIL_FROM` | | Pengirim email, mis. `Loki4x Academy <noreply@domainmu>` (domain harus terverifikasi di Resend) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | ✅ | Kredensial Cloudflare R2 |
| `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | ✅ | Bucket publik (foto sinyal, video thumbnail, dll) dan URL publiknya |
| `R2_PRIVATE_BUCKET_NAME` | ✅ | Bucket privat (foto chat/komunitas, bukti transfer) |
| `POKETO_API_KEY`, `POKETO_API_BASE`, `POKETO_WEBHOOK_SECRET` | | Pembayaran QRIS / VA |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | | Web Push di browser |
| `FIREBASE_SERVICE_ACCOUNT` | | JSON service account Firebase untuk push aplikasi Android (**rahasia**, isi utuh satu baris) |
| `MYFXBOOK_EMAIL`, `MYFXBOOK_PASSWORD` | | Data Retail Bias otomatis dari Myfxbook |
| `CRON_SECRET` | ✅ | Token rahasia untuk endpoint `/api/cron/*` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | | Email support di halaman Terms/Privacy |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | | Verifikasi Google Search Console |

Supabase → Authentication → URL Configuration → **Redirect URLs** perlu berisi domain web (`https://domainmu/auth/callback`) dan `loki4x://auth-callback` (login Google & reset password di aplikasi).

---

## Database (Supabase)

File SQL ada di folder `supabase/`. Jalankan di **Supabase → SQL Editor**; semua migrasi aman dijalankan ulang.

1. `schema.sql` — tabel dasar (`profiles`, `trades`, `news`) untuk project baru.
2. Migrasi fitur (urutan yang disarankan):
   - `journal-extras.sql`, `discipline-import.sql`
   - `push.sql`, `mobile-push.sql`, `signal-pairs.sql`
   - `signal-result-photo.sql`, `vip-broker.sql`, `rejection-reason.sql`
   - `academy-progress-quiz.sql`
   - `community-chat.sql` → `community-chat-images.sql` → `community-extras.sql` → `community-reply.sql`

> ⚠️ Beberapa tabel lama (mis. `signals`, `payments`, `vip_ib_requests`, `notifications`, `academy_videos`, `promo_codes`, `referrals`, `audit_logs`, `chat_threads`) dibuat langsung di dashboard Supabase dan belum punya file SQL lengkap di repo. Untuk membuat environment baru, ekspor skemanya dulu dari project produksi (`pg_dump --schema-only`).

Keamanan data mengandalkan **Row Level Security**: admin dikenali dari `profiles.is_admin`, dan operasi lintas user memakai service role hanya di server.

---

## Tugas terjadwal (GitHub Actions)

Workflow di `.github/workflows/` memanggil endpoint `/api/cron/*` dengan header `Authorization: Bearer $CRON_SECRET`.

| Workflow | Jadwal (WIB) | Tugas |
|---|---|---|
| `check-expiry.yml` | setiap hari 08:00 | Peringatan & akhir masa aktif member (email + push) |
| `news-reminders.yml` | tiap 5 menit, Senin–Jumat | Pengingat berita high impact |
| `weekly-calendar.yml` | Senin 07:00 | Email kalender ekonomi mingguan |
| `weekly-report.yml` | Sabtu 09:00 | Laporan trading & disiplin mingguan |
| `monthly-report.yml` | tanggal 1, 09:00 | Laporan bulanan |
| `backup-db.yml` | Senin 03:00 | Backup database terenkripsi (artifact) |

**Secrets GitHub** (Settings → Secrets and variables → Actions): `SITE_URL`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`.

---

## API aplikasi Android

Route di `app/api/mobile/**` dipakai aplikasi [Loki4x-apk](https://github.com/Loki4x/Loki4x-apk). Autentikasi memakai header `Authorization: Bearer <access_token Supabase>` (`lib/mobile-auth.ts`); RLS tetap berlaku sesuai user.

| Prefix | Isi |
|---|---|
| `/api/mobile/dashboard` | Isi Beranda aplikasi |
| `/api/mobile/trades`, `/accounts` | Trading journal |
| `/api/mobile/academy` | Kuis & progres Akademi |
| `/api/mobile/cot`, `/positioning`, `/calendar`, `/market-news` | Data pasar |
| `/api/mobile/community`, `/chat` | Komunitas & chat admin |
| `/api/mobile/upgrade`, `/referral` | Pembayaran & referral |
| `/api/mobile/push-token` | Token push FCM perangkat |
| `/api/mobile/admin/**` | Menu admin (cek `profiles.is_admin`) |

---

## Deploy

- Branch `main` otomatis di-deploy ke **Vercel**; setiap pull request mendapat deploy preview.
- Pastikan semua variabel lingkungan sudah diisi di Vercel sebelum deploy produksi.
- Setelah menambah file SQL baru, jalankan migrasinya di Supabase **sebelum** fitur yang memakainya digunakan.

---

## Catatan pengembangan

- **Bahasa** — teks ditulis dalam Bahasa Indonesia sebagai kunci, terjemahan Inggris di `lib/i18n/en-strings.ts` dan `lib/i18n/dictionary.ts`. Bahasa user disimpan di `profiles.language` dan dipakai juga untuk email & notifikasi.
- **Zona waktu** — data jam ditampilkan dalam WIB (UTC+7). Input tanggal-jam dari form diartikan sebagai WIB.
- **Tampilan** — tema Terang/Gelap lewat atribut `data-theme`, gaya Glassmorphism lewat `data-style="glass"` di `<html>` (hanya di area login `.app-shell`). Pilihan disimpan di `localStorage`.
- **File privat** — bukti transfer dan foto chat disimpan di bucket R2 privat dan hanya bisa dibuka lewat route yang mengecek akses (`/api/admin/slip`, `/api/chat/image`, `/api/community/image`).
- **Rate limit** — login, reset password, chat, dan komunitas dibatasi di server (`lib/rate-limit.ts`).

---

© Loki4x Academy. Hak cipta dilindungi.
