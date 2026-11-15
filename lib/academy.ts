// Kategori Akademi, aturan kuis, dan penilaian. Aman diimpor dari server maupun klien.

export type AcademyCategory = "TECHNICAL" | "FUNDAMENTAL" | "PSYCHOLOGY";

export const ACADEMY_CATEGORIES: Record<string, { db: AcademyCategory; title: string; subtitle: string }> = {
  technical: {
    db: "TECHNICAL",
    title: "Belajar Teknikal",
    subtitle: "Analisa chart, indikator, dan strategi teknikal.",
  },
  fundamental: {
    db: "FUNDAMENTAL",
    title: "Fundamental Forex",
    subtitle: "Ekonomi makro, berita, dan sentimen pasar.",
  },
  psychology: {
    db: "PSYCHOLOGY",
    title: "Psikologi & Risk",
    subtitle: "Manajemen risiko dan psikologi trading.",
  },
};

export const CATEGORY_LABEL: Record<AcademyCategory, string> = {
  TECHNICAL: "Teknikal",
  FUNDAMENTAL: "Fundamental",
  PSYCHOLOGY: "Psikologi",
};

export const isAcademyCategory = (v: unknown): v is AcademyCategory =>
  v === "TECHNICAL" || v === "FUNDAMENTAL" || v === "PSYCHOLOGY";

/** Nilai minimal lulus kuis (persen). */
export const QUIZ_PASS_PERCENT = 70;

/** Soal dengan kunci jawaban: hanya untuk server & admin. */
export interface QuizQuestion {
  id: string;
  category: AcademyCategory;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

/** Soal yang dikirim ke member: tanpa kunci jawaban. */
export interface PublicQuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface QuizResultItem {
  id: string;
  question: string;
  options: string[];
  selected: number | null;
  correct: number;
  explanation: string | null;
}

export interface QuizResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  items: QuizResultItem[];
}

export function toPublicQuestion(q: QuizQuestion): PublicQuizQuestion {
  return { id: q.id, question: q.question, options: q.options };
}

/** Nilai jawaban member. Soal yang tidak dijawab dihitung salah. */
export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, number>): QuizResult {
  const items = questions.map((q) => {
    const raw = answers[q.id];
    const selected = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      selected,
      correct: q.correct_index,
      explanation: q.explanation,
    };
  });
  const score = items.filter((i) => i.selected === i.correct).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  return { score, total, percent, passed: total > 0 && percent >= QUIZ_PASS_PERCENT, items };
}

/** Urutan acak (Fisher–Yates) supaya urutan soal berbeda tiap percobaan. */
export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
