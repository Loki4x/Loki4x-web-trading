import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from "crypto";

/**
 * Web Push tanpa paket tambahan: enkripsi pesan (RFC 8291, aes128gcm) + otorisasi VAPID (RFC 8292).
 * Hanya dipakai di server. Kunci VAPID dari env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string; // kunci publik browser (base64url, 65 byte)
  auth: string; // rahasia auth browser (base64url, 16 byte)
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export type PushResult = { ok: true } | { ok: false; status: number; gone: boolean };

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Header Authorization VAPID untuk satu push service (aud = origin endpoint). */
export function vapidAuthorization(
  endpoint: string,
  subject: string,
  publicKeyB64u: string,
  privateKeyB64u: string,
  nowSec = Math.floor(Date.now() / 1000)
): string {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: subject })));
  const unsigned = `${header}.${claims}`;

  const pub = fromB64u(publicKeyB64u); // 0x04 || x(32) || y(32)
  if (pub.length !== 65 || pub[0] !== 0x04) throw new Error("VAPID public key tidak valid");
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: privateKeyB64u },
    format: "jwk",
  });
  const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64u(signature)}, k=${publicKeyB64u}`;
}

/** Enkripsi payload untuk satu browser. `test` hanya untuk uji dengan vektor RFC 8291. */
export function encryptPayload(
  plaintext: Buffer,
  uaPublicB64u: string,
  authSecretB64u: string,
  test?: { asPrivate: Buffer; salt: Buffer }
): Buffer {
  const uaPublic = fromB64u(uaPublicB64u);
  const authSecret = fromB64u(authSecretB64u);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error("p256dh tidak valid");
  if (authSecret.length !== 16) throw new Error("auth tidak valid");

  const ecdh = createECDH("prime256v1");
  if (test) ecdh.setPrivateKey(test.asPrivate);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey(); // 65 byte
  const ecdhSecret = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32));

  const salt = test ? test.salt : randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  // Satu record: data + delimiter 0x02 (record terakhir).
  const record = Buffer.concat([plaintext, Buffer.from([0x02])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, encrypted]);
}

/** Kirim satu push. Tidak pernah melempar error; hasilnya dikembalikan sebagai PushResult. */
export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
  opts: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {}
): Promise<PushResult> {
  try {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return { ok: false, status: 0, gone: false };
    const subject = process.env.VAPID_SUBJECT || "https://www.loki4xacademy.web.id";

    const body = encryptPayload(Buffer.from(JSON.stringify(payload)), sub.p256dh, sub.auth);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(sub.endpoint, subject, pub, priv),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(opts.ttl ?? 3600),
        Urgency: opts.urgency ?? "high",
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch (err) {
    console.error("[web-push] gagal kirim:", err instanceof Error ? err.message : err);
    return { ok: false, status: 0, gone: false };
  }
}
