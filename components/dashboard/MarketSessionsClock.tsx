"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cx } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";

// Kill zone ICT: jam paling aktif tiap sesi, didefinisikan dalam waktu New York (sesuai konvensi ICT),
// jadi perubahan daylight saving otomatis ikut. Tampilan dikonversi ke WIB.
interface SessionDef {
  key: string;
  label: string;
  timeZone: string;
  startMin: number; // menit sejak 00:00 waktu lokal zona di atas
  endMin: number;
  /** hari (0=Minggu) di zona itu saat sesi berlangsung */
  days: number[];
  bar: string; // kelas warna bar timeline
  dot: string;
}

const NY = "America/New_York";
const WEEKDAYS = [1, 2, 3, 4, 5];

const SESSIONS: SessionDef[] = [
  // Asia dimulai Minggu–Kamis malam waktu New York (= Senin–Jumat pagi WIB).
  { key: "ASIA", label: "Asia", timeZone: NY, startMin: 19 * 60, endMin: 23 * 60, days: [0, 1, 2, 3, 4], bar: "bg-warning", dot: "bg-warning" },
  { key: "LONDON", label: "London", timeZone: NY, startMin: 2 * 60, endMin: 5 * 60, days: WEEKDAYS, bar: "bg-primary", dot: "bg-primary" },
  { key: "NY_AM", label: "New York AM", timeZone: NY, startMin: 7 * 60 + 30, endMin: 11 * 60, days: WEEKDAYS, bar: "bg-success", dot: "bg-success" },
  { key: "NY_PM", label: "New York PM", timeZone: NY, startMin: 13 * 60 + 30, endMin: 16 * 60, days: WEEKDAYS, bar: "bg-secondary", dot: "bg-secondary" },
];

const WIB_TZ = "Asia/Jakarta";
const DAY = 24 * 60;
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Hari (0=Minggu) dan menit sejak tengah malam pada zona waktu tertentu. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return { dow: DOW[get("weekday")] ?? 0, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Selisih zona waktu terhadap UTC (menit) pada saat tertentu. */
function utcOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** Pasar forex tutup dari Jumat 17:00 sampai Minggu 17:00 waktu New York. */
function isWeekendClosed(date: Date) {
  const { dow, minutes } = zonedParts(date, "America/New_York");
  return dow === 6 || (dow === 5 && minutes >= 17 * 60) || (dow === 0 && minutes < 17 * 60);
}

function minutesUntilMarketOpen(date: Date) {
  const { dow, minutes } = zonedParts(date, "America/New_York");
  return ((7 - dow) % 7) * DAY + 17 * 60 - minutes;
}

function fmtDuration(totalMin: number, en: boolean) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return en ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.floor(h / 24)} hari ${h % 24} jam`;
  const hr = en ? "h" : "j";
  return h > 0 ? `${h}${hr} ${m}m` : `${m}m`;
}

function fmtClock(min: number) {
  const n = ((min % DAY) + DAY) % DAY;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

interface SessionState extends SessionDef {
  open: boolean;
  wibStart: number;
  wibEnd: number;
  /** menit sampai tutup (kalau buka) atau sampai buka berikutnya (kalau tutup) */
  countdown: number;
}

/** Sesi aktif = hari sesi, dalam jam sesi, dan pasar forex tidak sedang libur weekend. */
function isSessionOpen(s: SessionDef, date: Date) {
  const { dow, minutes } = zonedParts(date, s.timeZone);
  return s.days.includes(dow) && minutes >= s.startMin && minutes < s.endMin && !isWeekendClosed(date);
}

/** Menit sampai sesi benar-benar buka lagi (melewati weekend kalau perlu). */
function minutesUntilSessionOpen(s: SessionDef, now: Date) {
  const { minutes } = zonedParts(now, s.timeZone);
  const firstStart = (s.startMin - minutes + DAY) % DAY || DAY;
  const candidates = Array.from({ length: 8 }, (_, k) => firstStart + k * DAY);
  return Math.min(
    ...candidates.filter((c) => isSessionOpen(s, new Date(now.getTime() + c * 60000))),
    8 * DAY
  );
}

function computeSessions(now: Date): SessionState[] {
  const wibOffset = utcOffsetMinutes(now, WIB_TZ);

  return SESSIONS.map((s) => {
    const { minutes } = zonedParts(now, s.timeZone);
    const shift = wibOffset - utcOffsetMinutes(now, s.timeZone);
    const open = isSessionOpen(s, now);

    return {
      ...s,
      open,
      wibStart: (((s.startMin + shift) % DAY) + DAY) % DAY,
      wibEnd: (((s.endMin + shift) % DAY) + DAY) % DAY,
      countdown: open ? s.endMin - minutes : minutesUntilSessionOpen(s, now),
    };
  });
}

/** Potong rentang sesi (WIB) jadi 1–2 segmen kalau melewati tengah malam. */
function segments(start: number, end: number): [number, number][] {
  return end > start ? [[start, end]] : [[start, DAY], [0, end]];
}

export function MarketSessionsClock() {
  const t = useT();
  const en = useLocale() === "en";
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="card h-[260px] animate-pulse" />;
  }

  const sessions = computeSessions(now);
  const weekend = isWeekendClosed(now);
  const wibNow = zonedParts(now, WIB_TZ).minutes;
  const active = sessions.find((s) => s.open);
  const next = [...sessions].sort((a, b) => a.countdown - b.countdown)[0];

  let statusText: string;
  let statusClass: string;
  if (weekend) {
    statusText = t("Pasar tutup (weekend) · buka dalam {time}", { time: fmtDuration(minutesUntilMarketOpen(now), en) });
    statusClass = "bg-error-subtle text-error";
  } else if (active) {
    statusText = t("Kill zone {name} sedang aktif · selesai dalam {time}", { name: active.label, time: fmtDuration(active.countdown, en) });
    statusClass = "bg-success-subtle text-success";
  } else {
    statusText = t("Di luar kill zone · {name} mulai dalam {time}", { name: next.label, time: fmtDuration(next.countdown, en) });
    statusClass = "bg-surface-2 text-text-secondary";
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-body font-semibold text-text-primary">
            <Clock className="h-4 w-4 text-primary" />
            {t("Jam Sesi Pasar")}
          </h3>
          <p className="text-caption text-text-muted">{t("Kill zone ICT · semua jam dalam WIB (UTC+7)")}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-h3 font-semibold tabular-nums text-text-primary">{fmtClock(wibNow)}</p>
          <p className="text-caption text-text-muted">WIB</p>
        </div>
      </div>

      <div className={cx("mb-4 rounded-lg px-3 py-2 text-body-sm font-medium", statusClass)}>{statusText}</div>

      {/* Timeline 24 jam (WIB) */}
      <div className="mb-4">
        <div className="relative flex flex-col gap-1.5">
          {sessions.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-caption font-medium text-text-secondary">{s.label}</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                {segments(s.wibStart, s.wibEnd).map(([a, b]) => (
                  <div
                    key={a}
                    className={cx("absolute inset-y-0 rounded-full", s.bar, s.open ? "opacity-100" : "opacity-40")}
                    style={{ left: `${(a / DAY) * 100}%`, width: `${((b - a) / DAY) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
          {/* Penanda waktu sekarang */}
          <div className="pointer-events-none absolute inset-y-0 left-[108px] right-0">
            <div
              className="absolute -inset-y-1 w-0.5 rounded-full bg-text-primary"
              style={{ left: `${(wibNow / DAY) * 100}%` }}
              title={fmtClock(wibNow)}
            />
          </div>
        </div>
        <div className="ml-[108px] mt-1 flex justify-between text-caption text-text-muted">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>

      {/* Detail per sesi */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {sessions.map((s) => (
          <div key={s.key} className="rounded-lg border border-border bg-surface-2/50 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
                <span className={cx("h-2 w-2 rounded-full", s.dot, s.open && "animate-pulse")} />
                {s.label}
              </span>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-caption font-semibold",
                  s.open ? "bg-success-subtle text-success" : "bg-surface-2 text-text-muted"
                )}
              >
                {s.open ? (en ? "Open" : "Buka") : en ? "Closed" : "Tutup"}
              </span>
            </div>
            <p className="font-mono text-caption tabular-nums text-text-secondary">
              {fmtClock(s.wibStart)} – {fmtClock(s.wibEnd)}
            </p>
            <p className="mt-1 text-caption text-text-muted">
              {s.open
                  ? t("Tutup dalam {time}", { time: fmtDuration(s.countdown, en) })
                  : t("Buka dalam {time}", { time: fmtDuration(s.countdown, en) })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
