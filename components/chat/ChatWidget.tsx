"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Paperclip, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { cx } from "@/lib/utils";
import { CHAT_MAX_LEN, CHAT_MESSAGE_COLUMNS, type ChatError, type ChatMessage } from "@/lib/chat";
import { prepareChatImage } from "@/lib/chat-image-client";
import { ChatImage } from "@/components/chat/ChatImage";
import { markChatReadByUser, sendChatImage, sendChatMessage } from "@/app/(dashboard)/chat/actions";

const POLL_CLOSED_MS = 60_000; // cek balasan baru saat panel tertutup
const POLL_OPEN_MS = 20_000; // cadangan kalau realtime terputus

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Tombol chat melayang di kanan bawah + panel percakapan dengan tim support. */
export function ChatWidget() {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const userIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);

  const loadThread = useCallback(async () => {
    if (!userIdRef.current) {
      const { data } = await supabase.auth.getSession();
      userIdRef.current = data.session?.user.id ?? null;
    }
    const uid = userIdRef.current;
    if (!uid) return null;
    const { data } = await supabase.from("chat_threads").select("id, user_unread").eq("user_id", uid).maybeSingle();
    if (data) {
      setThreadId(data.id);
      setUnread(!!data.user_unread);
    }
    return data;
  }, [supabase]);

  const loadMessages = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("chat_messages")
        .select(CHAT_MESSAGE_COLUMNS)
        .eq("thread_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as ChatMessage[]);
    },
    [supabase]
  );

  // Badge awal + cek berkala saat panel tertutup (hanya kalau tab sedang dilihat).
  useEffect(() => {
    loadThread();
    if (open) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadThread();
    }, POLL_CLOSED_MS);
    return () => clearInterval(timer);
  }, [open, loadThread]);

  // Saat panel dibuka: muat percakapan, tandai dibaca, dan ikuti pesan baru secara realtime.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const thread = await loadThread();
      if (cancelled || !thread) return;
      await loadMessages(thread.id);
      if (thread.user_unread) {
        setUnread(false);
        markChatReadByUser();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loadThread, loadMessages]);

  useEffect(() => {
    if (!open || !threadId) return;

    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_role === "ADMIN") markChatReadByUser();
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadMessages(threadId);
    }, POLL_OPEN_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [open, threadId, supabase, loadMessages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function errorText(code: ChatError) {
    switch (code) {
      case "empty":
        return t("Tulis pesanmu dulu.");
      case "too_long":
        return t("Pesan terlalu panjang (maksimal {n} karakter).", { n: CHAT_MAX_LEN });
      case "rate_limited":
        return t("Terlalu banyak pesan. Coba lagi beberapa menit lagi.");
      case "suspended":
        return t("Akunmu sedang dinonaktifkan.");
      case "auth":
        return t("Sesi login habis. Muat ulang halaman.");
      case "bad_image":
        return t("File harus berupa gambar (JPG, PNG, atau WebP).");
      case "image_too_big":
        return t("Foto terlalu besar (maksimal 2 MB).");
      default:
        return t("Pesan gagal terkirim. Coba lagi.");
    }
  }

  function clearPending() {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);
    setPreparing(true);
    const prepared = await prepareChatImage(picked);
    setPreparing(false);
    if (!prepared) {
      setError(t("File harus berupa gambar (JPG, PNG, atau WebP)."));
      return;
    }
    clearPending();
    setPending({ file: prepared, preview: URL.createObjectURL(prepared) });
  }

  async function handleSend() {
    const body = input.trim();
    if ((!body && !pending) || sending || preparing) return;
    setSending(true);
    setError(null);
    let res;
    if (pending) {
      const fd = new FormData();
      fd.append("image", pending.file);
      fd.append("caption", body);
      res = await sendChatImage(fd);
    } else {
      res = await sendChatMessage(body);
    }
    setSending(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setInput("");
    clearPending();
    setThreadId(res.threadId);
    setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t("Chat dengan tim support")}
          className="fixed bottom-24 right-4 z-40 flex h-[min(560px,calc(100vh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-md sm:right-6 sm:w-[380px]"
        >
          <header className="flex items-center justify-between bg-primary px-4 py-3 text-text-on-primary">
            <div>
              <p className="text-body font-semibold">{t("Support Loki4x Academy")}</p>
              <p className="text-caption opacity-80">{t("Biasanya dibalas dalam beberapa jam")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("Tutup chat")}
              className="rounded-full p-1.5 hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
            <div className="max-w-[85%]">
              <p className="mb-1 text-caption text-text-muted">{t("Loki4x Support")}</p>
              <div className="rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2 text-body-sm text-text-primary">
                {t("Halo! Ada yang bisa kami bantu? Tulis pesanmu di sini, tim kami akan membalas secepatnya.")}
              </div>
            </div>

            {messages.map((m) => {
              const mine = m.sender_role === "USER";
              return (
                <div key={m.id} className={cx("flex flex-col", mine ? "items-end" : "items-start")}>
                  {!mine && <p className="mb-1 text-caption text-text-muted">{t("Loki4x Support")}</p>}
                  <div
                    className={cx(
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-body-sm",
                      m.image_key && "w-60",
                      mine
                        ? "rounded-tr-sm bg-primary text-text-on-primary"
                        : "rounded-tl-sm bg-surface-2 text-text-primary"
                    )}
                  >
                    {m.image_key && (
                      <div className={cx(m.body && "mb-2")}>
                        <ChatImage imageKey={m.image_key} alt={t("Foto")} />
                      </div>
                    )}
                    {m.body}
                  </div>
                  <p className="mt-1 text-caption text-text-muted">{formatTime(m.created_at)}</p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border bg-surface p-3">
            {error && <p className="mb-2 text-caption text-error">{error}</p>}
            {(pending || preparing) && (
              <div className="mb-2 flex items-center gap-2">
                {pending ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob:) */}
                    <img src={pending.preview} alt={t("Foto")} className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={clearPending}
                      aria-label={t("Hapus foto")}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-caption text-text-muted">{t("Memproses foto...")}</p>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending || preparing}
                aria-label={t("Lampirkan foto")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, CHAT_MAX_LEN))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={t("Ketik pesan")}
                className="input-field max-h-28 min-h-[44px] flex-1 resize-none !rounded-2xl !py-2.5"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || preparing || (!input.trim() && !pending)}
                aria-label={t("Kirim")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("Tutup chat") : t("Buka chat support")}
        className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-text-on-primary shadow-md transition-transform hover:scale-105 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread && (
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-error" aria-hidden="true" />
        )}
      </button>
    </>
  );
}
