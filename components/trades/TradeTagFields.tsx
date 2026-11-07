"use client";

import { STRATEGY_MAX_LEN, STRATEGY_PRESETS, EMOTIONS, EMOTION_LABEL } from "@/lib/journal-tags";
import { useT } from "@/lib/i18n/client";

/** Isian strategi, emosi, dan "sesuai rencana?" untuk form tambah / ubah trade. */
export function TradeTagFields({
  strategyOptions = [],
  defaultStrategy = "",
  defaultEmotion = "",
  defaultFollowedPlan = null,
}: {
  /** Strategi yang pernah dipakai user, ditawarkan sebagai saran selain bawaan. */
  strategyOptions?: string[];
  defaultStrategy?: string | null;
  defaultEmotion?: string | null;
  defaultFollowedPlan?: boolean | null;
}) {
  const t = useT();
  const suggestions = Array.from(new Set([...strategyOptions, ...STRATEGY_PRESETS]));
  const plan = defaultFollowedPlan === true ? "yes" : defaultFollowedPlan === false ? "no" : "";

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-text-secondary">{t("Strategi (opsional)")}</label>
        <input
          name="strategy"
          list="journal-strategy-list"
          maxLength={STRATEGY_MAX_LEN}
          defaultValue={defaultStrategy ?? ""}
          placeholder={t("Pilih atau tulis sendiri, mis. Breakout")}
          className="input-field"
        />
        <datalist id="journal-strategy-list">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("Emosi saat entry")}</label>
          <select name="emotion" className="input-field" defaultValue={defaultEmotion ?? ""}>
            <option value="">{t("Nggak diisi")}</option>
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {t(EMOTION_LABEL[e])}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("Sesuai rencana?")}</label>
          <select name="followed_plan" className="input-field" defaultValue={plan}>
            <option value="">{t("Nggak diisi")}</option>
            <option value="yes">{t("Ya, sesuai rencana")}</option>
            <option value="no">{t("Tidak, melanggar rencana")}</option>
          </select>
        </div>
      </div>
    </>
  );
}
