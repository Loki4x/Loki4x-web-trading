import { Resend } from "resend";

// Dibuat saat pertama kali dipakai (bukan saat file di-load), supaya build tidak gagal
// kalau RESEND_API_KEY belum diset (mis. di environment Preview Vercel).
let client: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY belum diset — email tidak dikirim.");
    return null;
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

// Domain pengirim harus sudah berstatus Verified di Resend. Bisa diganti lewat env EMAIL_FROM tanpa ubah kode.
const FROM = process.env.EMAIL_FROM ?? "Loki4x Academy <noreply@loki4xacademy.web.id>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Gagal kirim email:", error);
  }
}

/** Kirim banyak email sekaligus (Resend batch, maks 100 per panggilan). Tidak melempar error. */
export async function sendEmailBatch(messages: { to: string; subject: string; html: string }[]) {
  const resend = getResend();
  if (!resend) return;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from: FROM, ...m }));
    try {
      const { error } = await resend.batch.send(chunk);
      if (error) console.error("Gagal kirim batch email:", error);
    } catch (error) {
      console.error("Gagal kirim batch email:", error);
    }
  }
}
