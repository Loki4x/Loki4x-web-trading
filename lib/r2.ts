import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Uploads a File to Cloudflare R2 and returns its public URL.
 * Returns null if no file was provided or the upload failed.
 */
export async function uploadToR2(file: File | null, keyPrefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  try {
    const ext = file.name.split(".").pop() || "jpg";
    const key = `${keyPrefix}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    return `${publicBase}/${key}`;
  } catch (err) {
    console.error("R2 upload failed:", err);
    return null;
  }
}
