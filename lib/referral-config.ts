// Pengaturan program referral. Ubah angka di sini, lalu deploy ulang.

// Hadiah untuk pengundang tiap kali orang yang diundang BERGABUNG (bayar VIP ATAU Membership,
// atau pengajuan VIP IB disetujui): hari VIP yang masuk ke SALDO (belum langsung aktif).
export const REFERRAL_REWARD_DAYS = 3;

// Saldo baru bisa DIKLAIM jadi hari VIP setelah terkumpul minimal sekian hari.
// Saat diklaim, seluruh saldo (bukan hanya 14 hari) ditambahkan sebagai VIP.
export const REFERRAL_CLAIM_THRESHOLD_DAYS = 14;

// Batas jumlah hadiah per pengundang (seumur hidup), untuk menahan penyalahgunaan.
export const REFERRAL_MAX_REWARDS_PER_REFERRER = 20;

// Referral hanya dicatat untuk akun BARU: dibuat maksimal sekian hari yang lalu.
export const REFERRAL_ACCOUNT_MAX_AGE_DAYS = 7;

// Cookie penyimpan kode referral dari link undangan (/r/KODE).
export const REFERRAL_COOKIE = "loki4x-ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Format kode referral: 8 karakter, tanpa huruf/angka yang mirip (0/O, 1/I/L).
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{8}$/;
