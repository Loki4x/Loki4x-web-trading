"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagesSquare, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const ADMIN_CHAT_EVENT = "admin-chat-new";

interface Toast {
  id: number;
  name: string;
  preview: string;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    /* browser memblokir suara sebelum ada interaksi — abaikan */
  }
}

/**
 * Notifikasi untuk admin: setiap ada pesan baru dari user muncul pop-up di pojok kanan atas
 * (di halaman mana pun), disertai bunyi singkat dan judul tab "(n) Pesan baru".
 * Dipasang hanya untuk akun admin.
 */
export function AdminChatNotifier() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const pathRef = useRef(pathname);
  const lastCountRef = useRef<number | null>(null);
  const baseTitleRef = useRef<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, "");
    let alive = true;

    function pushToast(name: string, preview: string) {
      if (pathRef.current.startsWith("/admin/chat") && document.visibilityState === "visible") return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, name, preview }]);
      beep();
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 9000);
    }

    function setTitle(count: number) {
      const base = baseTitleRef.current || document.title.replace(/^\(\d+\)\s*/, "");
      baseTitleRef.current = base;
      document.title = count > 0 && document.visibilityState === "hidden" ? `(${count}) Pesan baru - ${base}` : base;
    }

    async function refreshCount(notifyIfIncreased: boolean) {
      const { count } = await supabase
        .from("chat_threads")
        .select("id", { count: "exact", head: true })
        .eq("admin_unread", true);
      if (!alive) return;
      const n = count ?? 0;
      const prev = lastCountRef.current;
      lastCountRef.current = n;
      setTitle(n);
      if (notifyIfIncreased && prev !== null && n > prev) pushToast("User", "Ada pesan baru di Live Chat");
    }

    refreshCount(false);

    const channel = supabase
      .channel("admin-chat-notifier")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        const row = payload.new as { thread_id: string; sender_role: string; body: string; image_key: string | null };
        if (row.sender_role !== "USER") return;
        let name = "User";
        const { data: thread } = await supabase.from("chat_threads").select("user_id").eq("id", row.thread_id).maybeSingle();
        if (thread?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name, email").eq("id", thread.user_id).maybeSingle();
          name = p?.full_name || p?.email || "User";
        }
        if (!alive) return;
        window.dispatchEvent(new CustomEvent(ADMIN_CHAT_EVENT));
        const text = row.body.length > 90 ? row.body.slice(0, 90) + "…" : row.body;
        pushToast(name, row.image_key ? `📷 ${text || "Foto"}` : text);
        refreshCount(false);
      })
      .subscribe();

    // Cadangan kalau realtime terputus: cek jumlah belum dibaca tiap 30 detik.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshCount(true);
    }, 30_000);

    function onVisible() {
      if (document.visibilityState === "visible") refreshCount(false);
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      document.title = baseTitleRef.current || document.title;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[70] flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-primary/40 bg-surface p-3 shadow-lg"
        >
          <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <Link href="/admin/chat" onClick={() => setToasts((p) => p.filter((x) => x.id !== toast.id))} className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-text-primary">Pesan baru dari {toast.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{toast.preview}</p>
          </Link>
          <button
            onClick={() => setToasts((p) => p.filter((x) => x.id !== toast.id))}
            className="text-text-muted hover:text-text-primary"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
