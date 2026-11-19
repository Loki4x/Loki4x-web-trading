import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth, adminRun } from "@/lib/mobile-admin";
import { addQuizQuestionCore } from "@/lib/admin-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/admin/quiz {category, question, options: string[], correct_index, explanation?}
export async function POST(request: Request) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  return adminRun(async () => {
    const res = await addQuizQuestionCore(ctx, {
      category: body.category,
      question: body.question,
      options: Array.isArray(body.options) ? body.options : [],
      correctIndex: body.correct_index,
      explanation: body.explanation,
    });
    return res.success ? { ok: true } : { ok: false, message: ctx.t(res.message) };
  });
}
