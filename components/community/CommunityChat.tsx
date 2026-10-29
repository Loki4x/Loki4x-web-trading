"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { cx } from "@/lib/utils";
import {
  COMMUNITY_COLUMNS,
  COMMUNITY_MAX_LEN,
  COMMUNITY_PAGE_SIZE,
  ROOMS,
  ROOM_LABEL,
  canAccessRoom,
  type CommunityError,
  type CommunityMessage,
  type Room,
} from "@/lib/community";
import type { Tier } from "@/lib/tier";
import { deleteCommunityMessage, sendCommunityMessage } from "@/app/(dashboard)/community/actions";

const POLL_MS = 20_000; // cadangan kalau realtime terputus

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function badgeFor(m: CommunityMessage): { label: string; cls: string } | null {
  if (m.is_admin) return { label: "Admin", cls: "bg-error-subtle text-error" };
  if (m.author_tier === "MEMBERSHIP") return { label: "Membership", cls: "bg-primary-subtle text-primary" };
  if (m.author_tier === "VIP") return { label: "VIP", cls: "bg-warning-subtle text-warning" };
  return null;
}

export function CommunityChat({
  userId,
  tier,
  isAdmin,
  initialRoom,
  initialMessages,
}: {
  userId: string;
  tier: Tier;
  isAdmin: boolean;
  initialRoom: Room;
  initialMessages: CommunityMessage[];
}) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // auto-scroll hanya kalau user sedang di bawah

  const [room, setRoom] = useState<Room>(initialRoom);
  const [messages, setMessages] = useState<CommunityMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = canAccessRoom(tier, room);

  const loadMessages = useCallback(
    async (target: Room) => {
      const { data } = await supabase
        .from("community_messages")
        .select(COMMUNITY_COLUMNS)
        .eq("room", target)
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_PAGE_SIZE);
      if (data) setMessages((data as CommunityMessage[]).reverse());
    },
    [supabase]
  );

  // Ganti ruang: muat ulang pesan (lewati muat pertama karena sudah dikirim dari server).
  const firstLoad = useRef(true);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setMessages([]);
    setError(null);
    stickRef.current = true;
    if (canAccessRoom(tier, room)) loadMessages(room);
  }, [room, tier, loadMessages]);

  // Realtime + cadangan polling untuk ruang yang sedang dibuka.
  useEffect(() => {
    if (!allowed) return;

    const channel = supabase
      .channel(`community-${room}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `room=eq.${room}` },
        (payload) => {
          const msg = payload.new as CommunityMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        const id = (payload.old as { id?: string })?.id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadMessages(room);
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [room, allowed, supabase, loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function errorText(code: CommunityError) {
    switch (code) {
      case "empty":
        return t("Tulis pesanmu dulu.");
      case "too_long":
        return t("Pesan terlalu panjang (maksimal {n} karakter).", { n: COMMUNITY_MAX_LEN });
      case "rate_limited":
        return t("Terlalu cepat. Tunggu sebentar lalu coba lagi.");
      case "suspended":
        return t("Akunmu sedang disuspend.");
      case "forbidden":
        return t("Kamu belum punya akses ke ruang ini.");
      default:
        return t("Gagal mengirim pesan. Coba lagi.");
    }
  }

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await sendCommunityMessage(room, body);
    setSending(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setInput("");
    stickRef.current = true;
    setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("Hapus pesan ini?"))) return;
    const res = await deleteCommunityMessage(id);
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {ROOMS.map((r) => {
          const ok = canAccessRoom(tier, r);
          return (
            <button
              key={r}
              onClick={() => setRoom(r)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-body-sm font-medium transition-colors",
                room === r
                  ? "border-primary bg-primary text-text-on-primary"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-hover"
              )}
            >
              {!ok && <Lock className="h-3.5 w-3.5" />}
              {ROOM_LABEL[r]}
            </button>
          );
        })}
      </div>

      {!allowed ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-text-muted" />
          <p className="text-body font-semibold text-text-primary">
            {t("Ruang {room} khusus member {room}.", { room: ROOM_LABEL[room] })}
          </p>
          <p className="max-w-sm text-body-sm text-text-secondary">
            {t("Upgrade paketmu untuk bergabung ke obrolan ini.")}
          </p>
          <Link href="/upgrade" className="btn-primary">
            {t("access.cta")}
          </Link>
        </div>
      ) : (
        <div className="card flex h-[min(620px,calc(100vh-14rem))] flex-col !p-0">
          <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-body-sm text-text-muted">
                {t("Belum ada pesan. Jadi yang pertama menyapa!")}
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.user_id === userId;
                const badge = badgeFor(m);
                return (
                  <div key={m.id} className={cx("group flex flex-col", mine ? "items-end" : "items-start")}>
                    <div className="mb-1 flex items-center gap-2 text-caption text-text-muted">
                      <span className="font-medium text-text-secondary">{mine ? t("Kamu") : m.author_name}</span>
                      {badge && (
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", badge.cls)}>
                          {badge.label}
                        </span>
                      )}
                      <span>{formatTime(m.created_at)}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 transition-opacity hover:text-error group-hover:opacity-100 focus:opacity-100"
                          aria-label={t("Hapus pesan ini?")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div
                      className={cx(
                        "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-body-sm",
                        mine
                          ? "rounded-tr-sm bg-primary text-text-on-primary"
                          : "rounded-tl-sm bg-surface-2 text-text-primary"
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border p-3">
            {error && <p className="mb-2 text-caption text-error">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                maxLength={COMMUNITY_MAX_LEN}
                placeholder={t("Tulis pesan...")}
                className="input-field max-h-28 min-h-[44px] flex-1 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="btn-primary !px-4 disabled:opacity-50"
                aria-label={t("Kirim")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-right text-caption text-text-muted">
              {input.length}/{COMMUNITY_MAX_LEN}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
