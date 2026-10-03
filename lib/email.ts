import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "4x Comunity <noreply@4xcomunity.my.id>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
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
