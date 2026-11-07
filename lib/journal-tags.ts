// Pilihan untuk tag strategi dan emosi di jurnal. Aman diimpor dari komponen klien.

export const STRATEGY_PRESETS = [
  "Breakout",
  "Pullback / Retest",
  "Reversal",
  "Trend Following",
  "Support / Resistance",
  "Supply & Demand",
  "News Trade",
  "Scalping",
] as const;

export const EMOTIONS = ["CALM", "CONFIDENT", "FOMO", "FEAR", "GREEDY", "REVENGE", "TIRED"] as const;
export type Emotion = (typeof EMOTIONS)[number];

// Label bahasa Indonesia (kunci terjemahan t()); versi Inggris ada di en-strings.
export const EMOTION_LABEL: Record<Emotion, string> = {
  CALM: "Tenang",
  CONFIDENT: "Percaya diri",
  FOMO: "FOMO",
  FEAR: "Takut",
  GREEDY: "Serakah",
  REVENGE: "Balas dendam",
  TIRED: "Lelah",
};

export const STRATEGY_MAX_LEN = 40;

export function isEmotion(v: unknown): v is Emotion {
  return typeof v === "string" && (EMOTIONS as readonly string[]).includes(v);
}

/** "yes" / "no" dari form -> boolean; selain itu null (tidak diisi). */
export function parseFollowedPlan(v: FormDataEntryValue | null | undefined): boolean | null {
  return v === "yes" ? true : v === "no" ? false : null;
}
