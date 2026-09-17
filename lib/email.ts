import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    await resend.emails.send({
      from: "4x Comunity <noreply@4xcomunity.my.id>",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Gagal kirim email:", error);
  }
}
