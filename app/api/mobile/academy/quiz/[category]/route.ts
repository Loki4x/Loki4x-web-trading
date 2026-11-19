import { NextResponse } from "next/server";
import { journalAuth, readJson } from "@/lib/mobile-journal";
import { gradeAndRecordQuiz, loadQuizQuestions } from "@/lib/academy-core";
import { ACADEMY_CATEGORIES, QUIZ_PASS_PERCENT, shuffle, toPublicQuestion } from "@/lib/academy";

export const dynamic = "force-dynamic";

// GET /api/mobile/academy/quiz/<technical|fundamental|psychology> → soal acak TANPA kunci jawaban.
export async function GET(request: Request, { params }: { params: { category: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const meta = ACADEMY_CATEGORIES[params.category];
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const questions = await loadQuizQuestions(meta.db);
  return NextResponse.json({ passPercent: QUIZ_PASS_PERCENT, questions: shuffle(questions).map(toPublicQuestion) });
}

// POST /api/mobile/academy/quiz/<slug>  {answers: {questionId: optionIndex}} → hasil + pembahasan.
export async function POST(request: Request, { params }: { params: { category: string } }) {
  const ctx = await journalAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson(request);
  const res = await gradeAndRecordQuiz(ctx.user.id, params.category, body?.answers, ctx.t);
  if (!res.success) return NextResponse.json({ error: res.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: res.result });
}
