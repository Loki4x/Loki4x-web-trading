import { timingSafeEqual } from "crypto";

/**
 * Autentikasi endpoint cron: header `Authorization: Bearer <CRON_SECRET>`.
 * Kalau CRON_SECRET belum diisi, SEMUA request ditolak (fail closed).
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
