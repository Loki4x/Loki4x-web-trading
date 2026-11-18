import { createSign } from "crypto";
import type { PushPayload } from "@/lib/web-push";

/**
 * Push notification ke aplikasi Android (repo Loki4x-apk) lewat Firebase Cloud Messaging HTTP v1,
 * tanpa paket tambahan. Kredensial dari env FIREBASE_SERVICE_ACCOUNT: isi file JSON service account
 * Firebase (Project settings → Service accounts → Generate new private key), ditempel utuh.
 * Hanya dipakai di server.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  cachedAccount = null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      // Env di beberapa dashboard menyimpan baris baru sebagai "\n" literal.
      cachedAccount = {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, "\n"),
      };
    } else {
      console.error("[fcm] FIREBASE_SERVICE_ACCOUNT tidak lengkap (butuh project_id, client_email, private_key)");
    }
  } catch {
    console.error("[fcm] FIREBASE_SERVICE_ACCOUNT bukan JSON yang valid");
  }
  return cachedAccount;
}

export function fcmConfigured(): boolean {
  return serviceAccount() !== null;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** Access token OAuth2 (berlaku 1 jam, di-cache) dari JWT yang ditandatangani kunci service account. */
async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(account.private_key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!res.ok || !body?.access_token) throw new Error(`token OAuth gagal (HTTP ${res.status})`);
  cachedToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) };
  return body.access_token;
}

export type FcmResult = { ok: true } | { ok: false; gone: boolean; status: number };

/**
 * Kirim satu notifikasi ke satu HP. `gone` = token sudah tidak berlaku (aplikasi dihapus / logout),
 * baris token sebaiknya dihapus. Tidak melempar error.
 */
export async function sendFcm(
  token: string,
  payload: PushPayload,
  opts: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {}
): Promise<FcmResult> {
  const account = serviceAccount();
  if (!account) return { ok: false, gone: false, status: 0 };
  try {
    const bearer = await accessToken(account);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          // Data dibaca aplikasi saat notifikasi ditekan (buka layar sesuai url).
          data: { url: payload.url ?? "/dashboard", ...(payload.tag ? { tag: payload.tag } : {}) },
          android: {
            priority: opts.urgency === "high" || opts.urgency === undefined ? "high" : "normal",
            ttl: `${opts.ttl ?? 6 * 3600}s`,
            notification: {
              channel_id: "default",
              sound: "default",
              ...(payload.tag ? { tag: payload.tag } : {}),
            },
          },
        },
      }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    // 404 UNREGISTERED / 400 "not a valid FCM registration token" = token mati.
    // (INVALID_ARGUMENT saja tidak cukup: bisa juga karena isi pesan, dan token yang sehat tidak boleh dihapus.)
    const gone = res.status === 404 || (res.status === 400 && /registration token|UNREGISTERED/i.test(text));
    if (!gone) console.error("[fcm] gagal kirim:", res.status, text.slice(0, 300));
    return { ok: false, gone, status: res.status };
  } catch (err) {
    console.error("[fcm] error:", err instanceof Error ? err.message : err);
    return { ok: false, gone: false, status: 0 };
  }
}
