"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { compressImageFile } from "@/lib/compress-image";
import { useT } from "@/lib/i18n/client";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Pengganti <input type="file">: gambar dikompres otomatis di browser sebelum
 * dikirim, jadi tetap lolos batas ukuran upload. File non-gambar (mis. PDF) tidak diubah.
 * File hasil kompres dimasukkan kembali ke input, jadi FormData / onChange bekerja seperti biasa.
 */
export function ImageFileInput({ onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useT();
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget; // simpan dulu: currentTarget hilang setelah await
    const file = input.files?.[0];
    setInfo(null);

    if (file && file.type.startsWith("image/")) {
      setBusy(true);
      try {
        const out = await compressImageFile(file);
        if (out !== file) {
          const dt = new DataTransfer();
          dt.items.add(out);
          input.files = dt.files;
          setInfo(`${formatSize(file.size)} → ${formatSize(out.size)}`);
        }
      } catch {
        /* gagal kompres: pakai file asli */
      } finally {
        setBusy(false);
      }
    }
    onChange?.(e);
  }

  return (
    <>
      <input {...props} type="file" onChange={handleChange} />
      {busy && <p className="mt-1 text-caption text-text-muted">{t("Mengompres foto...")}</p>}
      {!busy && info && <p className="mt-1 text-caption text-text-muted">{t("Foto dikompres:")} {info}</p>}
    </>
  );
}
