import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Cuma tipe file ini yang boleh diupload (gambar buat screenshot trade/bukti
// transfer, plus PDF buat bukti transfer). Ekstensi file-nya juga ditentukan
// dari sini, bukan dari nama file asli, biar nggak bisa dipalsuin.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

// 2MB per file: Vercel membatasi body request ~4,5MB, dan form trade bisa mengirim 2 foto sekaligus.
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Uploads a File to Cloudflare R2 and returns its public URL.
 * Returns null if no file was provided, the type/size isn't allowed, or the upload failed.
 */
export async function uploadToR2(file: File | null, keyPrefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    console.error(`R2 upload ditolak: tipe file "${file.type}" nggak diizinkan`);
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    console.error(`R2 upload ditolak: ukuran file melebihi batas ${MAX_FILE_SIZE} bytes`);
    return null;
  }

  try {
    const key = `${keyPrefix}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    return `${publicBase}/${key}`;
  } catch (err) {
    console.error("R2 upload failed:", err);
    return null;
  }
}

// ---- Bucket PRIVAT (bukti transfer) ----
// Berkas di bucket ini tidak punya URL publik. Yang disimpan di database hanya kunci objek,
// diawali PRIVATE_SLIP_PREFIX, dan hanya admin yang bisa membukanya lewat /api/admin/slip.
export const PRIVATE_SLIP_PREFIX = "r2private:";

export async function uploadPrivateToR2(file: File | null, keyPrefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const bucket = process.env.R2_PRIVATE_BUCKET_NAME;
  if (!bucket) {
    console.error("R2_PRIVATE_BUCKET_NAME belum diisi: upload bukti transfer ditolak (sengaja tidak jatuh ke bucket publik)");
    return null;
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    console.error(`R2 upload ditolak: tipe file "${file.type}" nggak diizinkan`);
    return null;
  }
  if (file.size > MAX_FILE_SIZE) {
    console.error(`R2 upload ditolak: ukuran file melebihi batas ${MAX_FILE_SIZE} bytes`);
    return null;
  }

  try {
    const key = `${keyPrefix}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await r2Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: file.type }));
    return `${PRIVATE_SLIP_PREFIX}${key}`;
  } catch (err) {
    console.error("R2 private upload failed:", err);
    return null;
  }
}

export async function getPrivateR2Object(key: string) {
  const bucket = process.env.R2_PRIVATE_BUCKET_NAME;
  if (!bucket) throw new Error("R2_PRIVATE_BUCKET_NAME belum diisi");
  return r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
