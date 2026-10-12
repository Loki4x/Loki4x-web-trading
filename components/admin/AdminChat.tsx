"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/lib/utils";
import { CHAT_MAX_LEN, type ChatMessage } from "@/lib/chat";
import { fetchAdminChatThreads, type AdminChatThread } from "@/lib/chat-admin";
import { adminMarkChatRead, adminReplyChat, adminSetChatStatus } from "@/app/admin/chat/actions";

const POLL_MS = 15_000; // cadangan kalau realtime terputus

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

type Filter = "ALL" | "UNREAD";

export function AdminChat({ initialThreads }: { initialThreads: AdminChatThread[] }) {
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  // selectedId dipakai di callback realtime; ref menjaga nilainya tetap terbaru tanpa subscribe ulang.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const refreshThreads = useCallback(async () => {
    setThreads(await fetchAdminChatThreads(supabase));
  }, [supabase]);

  const loadMessages = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, thread_id, sender_role, body, created_at")
        .eq("thread_id", id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (data) setMessages(data as ChatMessage[]);
    },
    [supabase]
  );

  // Pesan baru dari user mana pun: perbarui daftar, dan percakapan yang sedang dibuka.
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages((prev) =>
          msg.thread_id === selectedIdRef.current && !prev.some((m) => m.id === msg.id) ? [...prev, msg] : prev
        );
        if (msg.sender_role === "USER" && msg.thread_id === selectedIdRef.current) adminMarkChatRead(msg.thread_id);
        refreshThreads();
      })
      .subscribe();

    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshThreads();
      if (selectedIdRef.current) loadMessages(selectedIdRef.current);
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshThreads, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedId]);

  async function openThread(id: string) {
    setSelectedId(id);
    setMessages([]);
    setError(null);
    setInput("");
    await loadMessages(id);
    const t = threads.find((x) => x.id === id);
    if (t?.admin_unread) {
      setThreads((prev) => prev.map((x) => (x.id === id ? { ...x, admin_unread: false } : x)));
      adminMarkChatRead(id);
    }
  }

  async function handleSend() {
    const body = input.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    setError(null);
    const res = await adminReplyChat(selected.id, body);
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInput("");
    setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
    refreshThreads();
  }

  async function toggleStatus() {
    if (!selected) return;
    const next = selected.status === "OPEN" ? "CLOSED" : "OPEN";
    setThreads((prev) => prev.map((x) => (x.id === selected.id ? { ...x, status: next } : x)));
    await adminSetChatStatus(selected.id, next);
  }

  const visible = threads.filter((t) => (filter === "UNREAD" ? t.admin_unread : true));
  const unreadCount = threads.filter((t) => t.admin_unread).length;

  return (
    <div className="grid h-[calc(100vh-12rem)] min-h-[480px] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Daftar percakapan */}
      <div className={cx("card flex min-h-0 flex-col !p-0", selected && "hidden lg:flex")}>
        <div className="flex gap-2 border-b border-border p-3">
          {(["ALL", "UNREAD"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cx(
                "rounded-full px-3 py-1.5 text-body-sm font-semibold transition-colors",
                filter === key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
              )}
            >
              {key === "ALL" ? "Semua" : `Belum dibaca (${unreadCount})`}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && (
            <p className="px-4 py-10 text-center text-body-sm text-text-muted">Belum ada percakapan.</p>
          )}
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openThread(t.id)}
              className={cx(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                selectedId === t.id && "bg-surface-2"
              )}
            >
              <span
                className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", t.admin_unread ? "bg-primary" : "bg-transparent")}
                aria-label={t.admin_unread ? "Belum dibaca" : undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cx("truncate text-body-sm text-text-primary", t.admin_unread ? "font-bold" : "font-medium")}>
                    {t.name}
                  </span>
                  <span className="shrink-0 text-caption text-text-muted">{timeLabel(t.last_message_at)}</span>
                </span>
                <span className="block truncate text-caption text-text-secondary">{t.last_message_preview ?? ""}</span>
                {t.status === "CLOSED" && (
                  <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-badge text-text-muted">Selesai</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Percakapan terpilih */}
      <div className={cx("card flex min-h-0 flex-col !p-0", !selected && "hidden lg:flex")}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-body-sm text-text-muted">
            Pilih percakapan di sebelah kiri.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover lg:hidden"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-text-primary">{selected.name}</p>
                  <p className="truncate text-caption text-text-muted">{selected.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleStatus}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-body-sm font-semibold text-text-secondary hover:bg-surface-hover"
              >
                {selected.status === "OPEN" ? "Tandai selesai" : "Buka lagi"}
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
              {messages.map((m) => {
                const fromAdmin = m.sender_role === "ADMIN";
                return (
                  <div key={m.id} className={cx("flex flex-col", fromAdmin ? "items-end" : "items-start")}>
                    <div
                      className={cx(
                        "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-body-sm",
                        fromAdmin
                          ? "rounded-tr-sm bg-primary text-text-on-primary"
                          : "rounded-tl-sm bg-surface-2 text-text-primary"
                      )}
                    >
                      {m.body}
                    </div>
                    <p className="mt-1 text-caption text-text-muted">
                      {fromAdmin ? "Admin · " : ""}
                      {timeLabel(m.created_at)}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3">
              {error && <p className="mb-2 text-caption text-error">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, CHAT_MAX_LEN))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Tulis balasan (Enter = kirim, Shift+Enter = baris baru)"
                  className="input-field max-h-32 flex-1 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-body-sm font-semibold text-text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Kirim
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
