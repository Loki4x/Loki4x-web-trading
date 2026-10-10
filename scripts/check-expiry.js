// Berhenti dengan pesan yang jelas kalau secret GitHub belum diisi (Settings > Secrets and variables > Actions).
const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("Secret GitHub belum diisi: " + missing.join(", "));
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
// Pengirim harus dari domain yang sudah Verified di Resend. Bisa diganti lewat env EMAIL_FROM.
const FROM = process.env.EMAIL_FROM || "Loki4x Academy <noreply@loki4xacademy.web.id>";

function emailHtml(title, message) {
  return `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">LOKI4X ACADEMY</p>
        <h2 style="color:#ffffff; font-size:18px;">${title}</h2>
        <p style="color:#c5c9d3; font-size:14px; line-height:1.6;">${message}</p>
      </div>
    </div>
  `;
}

async function sendEmail(to, subject, html) {
  if (!to) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("Gagal kirim email ke", to, e);
  }
}

async function run() {
  const { data: profiles, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, tier, vip_expires_at")
    .neq("tier", "FREE")
    .not("vip_expires_at", "is", null);

  if (fetchError) throw new Error("Gagal mengambil profil: " + fetchError.message);
  if (!profiles) return;

  let failures = 0;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const p of profiles) {
    const expiryDate = p.vip_expires_at.slice(0, 10);

    if (expiryDate === tomorrowStr) {
      const title = "Langganan kamu akan berakhir besok";
      const message = `Paket ${p.tier} kamu akan berakhir besok (${expiryDate}). Perpanjang sekarang biar aksesmu nggak terputus.`;
      await supabase.from("notifications").insert({ user_id: p.id, type: "EXPIRY_WARNING", title, message });
      await sendEmail(p.email, title, emailHtml(title, message));
      console.log(`Warning terkirim ke ${p.email}`);
    }

    if (expiryDate < todayStr) {
      const title = "Langganan kamu sudah berakhir";
      const message = `Paket ${p.tier} kamu sudah berakhir. Upgrade lagi kapan aja buat buka semua fitur.`;
      const { error: downgradeError } = await supabase
        .from("profiles")
        .update({ tier: "FREE", vip_expires_at: null })
        .eq("id", p.id);
      if (downgradeError) {
        console.error(`Gagal menurunkan ${p.email} ke FREE: ${downgradeError.message}`);
        failures++;
        continue;
      }
      await supabase.from("notifications").insert({ user_id: p.id, type: "EXPIRY_ENDED", title, message });
      await sendEmail(p.email, title, emailHtml(title, message));
      console.log(`Expiry ended terkirim ke ${p.email}`);
    }
  }

  console.log("Selesai cek expiry.");
  if (failures > 0) {
    console.error(`${failures} user gagal diproses.`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
