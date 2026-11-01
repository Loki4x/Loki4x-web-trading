"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROOMS } from "@/lib/community";

const POLL_MS = 60_000;
// Ruang yang belum pernah dibuka: hitung pesan 2 hari terakhir saja, supaya tidak ada angka raksasa untuk member baru.
const FIRST_VISIT_WINDOW_MS = 2 * 24 * 3600 * 1000;

/** Angka pesan komunitas yang belum dibaca, ditampilkan di samping menu Community pada sidebar. */
export function CommunityUnreadBadge() {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData.session?.user.id;
      if (!me) return;

      const { data: reads } = await supabase.from("community_reads").select("room, last_read_at");
      const lastRead = new Map((reads ?? []).map((r: { room: string; last_read_at: string }) => [r.room, r.last_read_at]));
      const fallback = new Date(Date.now() - FIRST_VISIT_WINDOW_MS).toISOString();

      // RLS memastikan ruang yang tidak boleh dibaca user selalu menghasilkan 0.
      const counts = await Promise.all(
        ROOMS.map(async (room) => {
          const { count: c } = await supabase
            .from("community_messages")
            .select("id", { count: "exact", head: true })
            .eq("room", room)
            .neq("user_id", me)
            .gt("created_at", lastRead.get(room) ?? fallback);
          return c ?? 0;
        })
      );
      setCount(counts.reduce((a, b) => a + b, 0));
    } catch {
      /* gagal sesaat: biarkan angka lama */
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onRead = () => refresh();
    window.addEventListener("community:read", onRead);

    const channel = supabase
      .channel("community-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, () => refresh())
      .subscribe();

    return () => {
      clearInterval(timer);
      window.removeEventListener("community:read", onRead);
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
