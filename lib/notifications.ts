import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

type NotificationType = "ANNOUNCEMENT" | "TIER_UPGRADE" | "EXPIRY_WARNING" | "EXPIRY_ENDED";

type NotificationChannels = {
  website?: boolean;
  email?: boolean;
};

function emailHtml(title: string, message: string) {
  return `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">4X COMUNITY</p>
        <h2 style="color:#ffffff; font-size:18px;">${title}</h2>
        <p style="color:#c5c9d3; font-size:14px; line-height:1.6;">${message}</p>
      </div>
    </div>
  `;
}

export async function notifyUser({
  userId,
  email,
  type,
  title,
  message,
  channels = { website: true, email: true },
}: {
  userId: string;
  email: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannels;
}) {
  const supabase = await createClient();

  if (channels.website) {
    await supabase.from("notifications").insert({ user_id: userId, type, title, message });
  }

  if (channels.email && email) {
    await sendEmail({ to: email, subject: title, html: emailHtml(title, message) });
  }
}

export async function notifyAllUsers({
  type,
  title,
  message,
  channels = { website: true, email: true },
}: {
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannels;
}) {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id, email");
  if (!profiles) return;

  if (channels.website) {
    await supabase.from("notifications").insert(profiles.map((p) => ({ user_id: p.id, type, title, message })));
  }

  if (channels.email) {
    for (const p of profiles) {
      if (p.email) await sendEmail({ to: p.email, subject: title, html: emailHtml(title, message) });
    }
  }
}
