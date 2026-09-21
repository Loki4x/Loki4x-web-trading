import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
