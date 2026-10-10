/** Domain publik situs. Dipakai di link email, link undangan referral, dan redirect reset password. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.loki4xacademy.web.id").replace(/\/$/, "");

/** Alamat dukungan yang tampil di Terms/Privacy. Pastikan kotak masuknya benar-benar ada (bisa diatur lewat env). */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@loki4xacademy.web.id";
