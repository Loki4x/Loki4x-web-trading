import { NextResponse } from "next/server";
import { journalAuth } from "@/lib/mobile-journal";
import { quizQuestionCounts } from "@/lib/academy-core";

export const dynamic = "force-dynamic";

// GET /api/mobile/academy → jumlah soal kuis per kategori (soal hanya bisa dibaca server).
// Video, progres tonton, dan riwayat kuis dibaca aplikasi langsung dari Supabase (RLS).
export async function GET(request: Request) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json({ quizCounts: await quizQuestionCounts() });
}
