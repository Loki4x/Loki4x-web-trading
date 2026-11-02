"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CornerUpLeft, Flag, Lock, Megaphone, Paperclip, Pin, PinOff, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { cx } from "@/lib/utils";
import {
  COMMUNITY_COLUMNS,
  COMMUNITY_MAX_LEN,
  COMMUNITY_MAX_MENTIONS,
  COMMUNITY_PAGE_SIZE,
  ROOMS,
  ROOM_LABEL,
  canAccessRoom,
  canWriteRoom,
  type CommunityError,
  type CommunityMessage,
  type Room,
} from "@/lib/community";
import type { Tier } from "@/lib/tier";
import { prepareChatImage } from "@/lib/chat-image-client";
import { CommunityImage } from "@/components/community/CommunityImage";
import {
  deleteCommunityMessage,
  pinCommunityMessage,
  reportCommunityMessage,
  sendCommunityImage,
  sendCommunityMessage,
} from "@/app/(dashboard)/community/actions";

const POLL_MS = 20_000; // cadangan kalau realtime terputus

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeRe(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  initialPinned,
}: {
  userId: string;
  tier: Tier;
  isAdmin: boolean;
  initialRoom: Room;
  initialMessages: CommunityMessage[];
  initialPinned: CommunityMessage | null;
}) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // auto-scroll hanya kalau user sedang di bawah
  const fileRef = useRef<HTMLInputElement>(null);

  const [room, setRoom] = useState<Room>(initialRoom);
  const [messages, setMessages] = useState<CommunityMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pinned, setPinned] = useState<CommunityMessage | null>(initialPinned);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [mentioned, setMentioned] = useState<Map<string, string>>(new Map()); // id → nama
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allowed = canAccessRoom(tier, room);
  const canWrite = canWriteRoom(tier, room, isAdmin);

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

  const loadPinned = useCallback(
    async (target: Room) => {
      const { data } = await supabase
        .from("community_messages")
        .select(COMMUNITY_COLUMNS)
        .eq("room", target)
        .not("pinned_at", "is", null)
        .order("pinned_at", { ascending: false })
        .limit(1);
      setPinned(((data ?? [])[0] ?? null) as CommunityMessage | null);
    },
    [supabase]
  );

  // Tandai ruang ini sudah dibaca (menghilangkan badge di sidebar).
  const markRead = useCallback(
    async (target: Room) => {
      await supabase
        .from("community_reads")
        .upsert({ user_id: userId, room: target, last_read_at: new Date().toISOString() }, { onConflict: "user_id,room" });
      window.dispatchEvent(new CustomEvent("community:read"));
    },
    [supabase, userId]
  );

  // Ganti ruang: muat ulang pesan (lewati muat pertama karena sudah dikirim dari server).
  const firstLoad = useRef(true);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setMessages([]);
    setPinned(null);
    setError(null);
    setNotice(null);
    clearPending();
    setReplyTo(null);
    setMentioned(new Map());
    setMentionQuery(null);
    stickRef.current = true;
    if (canAccessRoom(tier, room)) {
      loadMessages(room);
      loadPinned(room);
    }
  }, [room, tier, loadMessages, loadPinned]);

  // Buka ruang = sudah dibaca.
  useEffect(() => {
    if (allowed) markRead(room);
  }, [room, allowed, markRead]);

  // Admin: jumlah laporan per pesan (RLS hanya mengizinkan admin membaca tabel laporan).
  useEffect(() => {
    if (!isAdmin || messages.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("community_reports")
        .select("message_id")
        .in("message_id", messages.map((m) => m.id));
      if (cancelled || !data) return;
      const counts: Record<string, number> = {};
      for (const r of data as { message_id: string }[]) counts[r.message_id] = (counts[r.message_id] ?? 0) + 1;
      setReportCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, messages, supabase]);

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
          if (document.visibilityState === "visible") markRead(room);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_messages", filter: `room=eq.${room}` },
        (payload) => {
          const msg = payload.new as CommunityMessage;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned_at: msg.pinned_at } : m)));
          setPinned((prev) => {
            if (msg.pinned_at) return !prev || new Date(msg.pinned_at) >= new Date(prev.pinned_at ?? 0) ? msg : prev;
            return prev?.id === msg.id ? null : prev;
          });
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        const id = (payload.old as { id?: string })?.id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMessages(room);
        loadPinned(room);
      }
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [room, allowed, supabase, loadMessages, loadPinned, markRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // Orang yang bisa disebut: penulis lain yang pesannya sudah tampil di ruang ini.
  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) if (m.user_id !== userId && !map.has(m.user_id)) map.set(m.user_id, m.author_name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [messages, userId]);

  const mentionRe = useMemo(() => {
    const names = Array.from(new Set(messages.map((m) => m.author_name))).sort((a, b) => b.length - a.length);
    return names.length ? new RegExp(`(@(?:${names.map(escapeRe).join("|")}))`, "g") : null;
  }, [messages]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return people.filter((p) => p.name.toLowerCase().startsWith(q)).slice(0, 5);
  }, [mentionQuery, people]);

  function renderBody(text: string, mine: boolean) {
    if (!mentionRe) return text;
    return text.split(mentionRe).map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className={mine ? "font-bold underline" : "font-semibold text-primary"}>
          {part}
        </span>
      ) : (
        part
      )
    );
  }

  function onInputChange(value: string) {
    setInput(value);
    const m = /(?:^|\s)@([^\s@]{0,24})$/.exec(value);
    setMentionQuery(m ? m[1] : null);
  }

  function pickMention(p: { id: string; name: string }) {
    setInput((prev) => prev.replace(/(^|\s)@[^\s@]{0,24}$/, `$1@${p.name} `));
    setMentioned((prev) => new Map(prev).set(p.id, p.name));
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  function startReply(m: CommunityMessage) {
    setReplyTo(m);
    inputRef.current?.focus();
  }

  function jumpTo(id: string | null) {
    if (!id) return;
    document.getElementById(`cmsg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearPending() {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError(null);
    setPreparing(true);
    const prepared = await prepareChatImage(picked);
    setPreparing(false);
    if (!prepared) {
      setError(t("Foto tidak bisa dipakai. Pilih foto JPG, PNG, atau WebP (maksimal 2MB)."));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return { file: prepared, preview: URL.createObjectURL(prepared) };
    });
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
      case "bad_image":
        return t("Foto tidak bisa dipakai. Pilih foto JPG, PNG, atau WebP (maksimal 2MB).");
      case "image_too_big":
        return t("Foto terlalu besar (maksimal 2MB).");
      default:
        return t("Gagal mengirim pesan. Coba lagi.");
    }
  }

  async function handleSend() {
    const body = input.trim();
    if ((!body && !pending) || sending || preparing) return;
    setSending(true);
    setError(null);
    // Hanya mention yang namanya masih tertulis di pesan.
    const mentionIds = Array.from(mentioned)
      .filter(([, name]) => body.includes(`@${name}`))
      .map(([id]) => id)
      .slice(0, COMMUNITY_MAX_MENTIONS);
    let res;
    if (pending) {
      const fd = new FormData();
      fd.set("room", room);
      fd.set("image", pending.file);
      fd.set("caption", body);
      if (replyTo) fd.set("reply_to", replyTo.id);
      fd.set("mentions", JSON.stringify(mentionIds));
      res = await sendCommunityImage(fd);
    } else {
      res = await sendCommunityMessage(room, body, { replyTo: replyTo?.id, mentionIds });
    }
    setSending(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setInput("");
    setReplyTo(null);
    setMentioned(new Map());
    setMentionQuery(null);
    clearPending();
    stickRef.current = true;
    setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("Hapus pesan ini?"))) return;
    const res = await deleteCommunityMessage(id);
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handlePin(m: CommunityMessage) {
    const next = !m.pinned_at;
    const res = await pinCommunityMessage(m.id, next);
    if (!res.ok) return;
    const stamp = next ? new Date().toISOString() : null;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned_at: stamp } : x)));
    setPinned((prev) => (next ? { ...m, pinned_at: stamp } : prev?.id === m.id ? null : prev));
  }

  async function handleReport(id: string) {
    if (!window.confirm(t("Laporkan pesan ini ke admin?"))) return;
    const res = await reportCommunityMessage(id);
    if (res.ok) {
      setReported((prev) => new Set(prev).add(id));
      setNotice(t("Laporan terkirim. Terima kasih."));
    } else {
      setNotice(res.error === "rate_limited" ? t("Terlalu cepat. Tunggu sebentar lalu coba lagi.") : t("Gagal mengirim laporan."));
    }
    setTimeout(() => setNotice(null), 4000);
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
              {r === "ANNOUNCEMENT" && ok && <Megaphone className="h-3.5 w-3.5" />}
              {t(ROOM_LABEL[r])}
            </button>
          );
        })}
      </div>

      {notice && <p className="mb-2 text-caption text-success">{notice}</p>}

      {!allowed ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-text-muted" />
          <p className="text-body font-semibold text-text-primary">
            {t("Ruang {room} khusus member {room}.", { room: t(ROOM_LABEL[room]) })}
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
          {pinned && (
            <div className="flex items-start gap-2 border-b border-border bg-primary-subtle px-4 py-2">
              <Pin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-caption font-semibold text-primary">{t("Disematkan")}</p>
                <p className="line-clamp-2 break-words text-body-sm text-text-primary">
                  {pinned.body || t("Foto dari {name}", { name: pinned.author_name })}
                </p>
              </div>
            </div>
          )}
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
                  <div id={`cmsg-${m.id}`} key={m.id} className={cx("group flex flex-col", mine ? "items-end" : "items-start")}>
                    <div className="mb-1 flex items-center gap-2 text-caption text-text-muted">
                      <span className="font-medium text-text-secondary">{mine ? t("Kamu") : m.author_name}</span>
                      {badge && (
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", badge.cls)}>
                          {badge.label}
                        </span>
                      )}
                      <span>{formatTime(m.created_at)}</span>
                      {m.pinned_at && <Pin className="h-3 w-3 text-primary" aria-label={t("Disematkan")} />}
                      {canWrite && (
                        <button
                          onClick={() => startReply(m)}
                          className="rounded p-0.5 text-text-muted transition-colors hover:text-primary"
                          aria-label={t("Balas")}
                          title={t("Balas")}
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isAdmin && (reportCounts[m.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-warning-subtle px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          <Flag className="h-3 w-3" />
                          {reportCounts[m.id]}
                        </span>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handlePin(m)}
                            className="rounded p-0.5 text-text-muted transition-colors hover:text-primary"
                            aria-label={m.pinned_at ? t("Lepas sematan") : t("Sematkan pesan")}
                            title={m.pinned_at ? t("Lepas sematan") : t("Sematkan pesan")}
                          >
                            {m.pinned_at ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="rounded p-0.5 text-text-muted transition-colors hover:text-error"
                            aria-label={t("Hapus pesan")}
                            title={t("Hapus pesan")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {!isAdmin && !mine && (
                        <button
                          onClick={() => handleReport(m.id)}
                          disabled={reported.has(m.id)}
                          className="rounded p-0.5 text-text-muted transition-colors hover:text-warning disabled:opacity-40"
                          aria-label={t("Laporkan pesan")}
                          title={t("Laporkan pesan")}
                        >
                          <Flag className="h-3.5 w-3.5" />
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
                      {(m.reply_to || m.reply_name) && (
                        <button
                          type="button"
                          onClick={() => jumpTo(m.reply_to)}
                          className={cx(
                            "mb-2 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-caption",
                            mine ? "border-white/70 bg-white/15" : "border-primary bg-surface"
                          )}
                        >
                          <span className="block font-semibold">{m.reply_name}</span>
                          <span className="line-clamp-2 break-words opacity-80">{m.reply_excerpt || t("Foto")}</span>
                        </button>
                      )}
                      {m.image_key && (
                        <div className={cx(m.body && "mb-2", "w-56 max-w-full")}>
                          <CommunityImage imageKey={m.image_key} alt={t("Foto dari {name}", { name: m.author_name })} />
                        </div>
                      )}
                      {renderBody(m.body, mine)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!canWrite ? (
            <div className="border-t border-border p-4 text-center text-body-sm text-text-muted">
              {t("Hanya admin yang bisa menulis di ruang ini.")}
            </div>
          ) : (
          <div className="border-t border-border p-3">
            {error && <p className="mb-2 text-caption text-error">{error}</p>}
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-surface-2 px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-semibold text-primary">{t("Membalas {name}", { name: replyTo.author_name })}</p>
                  <p className="line-clamp-1 break-words text-caption text-text-secondary">
                    {replyTo.body || t("Foto dari {name}", { name: replyTo.author_name })}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="rounded-full p-1 text-text-muted hover:text-error" aria-label={t("Batal membalas")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {suggestions.length > 0 && (
              <ul className="mb-2 overflow-hidden rounded-lg border border-border bg-surface">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickMention(p)}
                      className="w-full px-3 py-2 text-left text-body-sm text-text-primary hover:bg-surface-hover"
                    >
                      @{p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pending && (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob) */}
                <img src={pending.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button onClick={clearPending} className="rounded-full p-1 text-text-muted hover:text-error" aria-label={t("Hapus foto")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={sending || preparing}
                className="btn-secondary !px-3 disabled:opacity-50"
                aria-label={t("Kirim foto")}
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
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
                disabled={sending || preparing || (!input.trim() && !pending)}
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
          )}
        </div>
      )}
    </div>
  );
}
