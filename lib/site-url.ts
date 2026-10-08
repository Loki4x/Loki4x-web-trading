/** Domain publik situs. Dipakai di link email, link undangan referral, dan redirect reset password. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.loki4xacademy.web.id").replace(/\/$/, "");
