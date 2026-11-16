// Baca file statement MT4/MT5 (HTML) dan CSV menjadi baris trade untuk di-import ke jurnal.
// Fungsi murni tanpa DOM, jadi bisa dipakai di browser dan diuji di Node.

import { EMOTIONS, type Emotion } from "@/lib/journal-tags";

export interface ImportRow {
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  pips: number | null;
  trade_date: string; // YYYY-MM-DD
  session: string | null;
  notes: string | null;
  confluence: string | null;
  strategy: string | null;
  emotion: Emotion | null;
  followed_plan: boolean | null;
  external_id: string | null;
}

export type ImportFormat = "MT4" | "MT5" | "CSV";

export interface ParseResult {
  format: ImportFormat | null;
  rows: ImportRow[];
  /** baris data yang dikenali tapi tidak bisa dibaca (angka/tanggal rusak, dll.) */
  skipped: number;
}

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

/** Report MT5 biasanya UTF-16 (ada BOM FF FE). Deteksi lalu decode jadi string. */
export function decodeFileBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  // UTF-16 tanpa BOM: banyak byte nol di posisi ganjil.
  const sample = bytes.subarray(0, 400);
  let zeros = 0;
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0) zeros++;
  if (sample.length > 20 && zeros > sample.length / 4) return new TextDecoder("utf-16le").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DATETIME_RE = /^(\d{4})[.\-/](\d{2})[.\-/](\d{2})[ T]\d{2}:\d{2}(:\d{2})?$/;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** "1 234.56" / "-12.50" / "" -> number | null */
function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.replace(/[\s ]/g, "");
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/**
 * "XAUUSDm" -> "XAUUSD", "EURUSD.pro" -> "EURUSD", "GBPJPY-ECN" -> "GBPJPY".
 * Akhiran broker dibuang supaya pair sama dengan trade yang dicatat manual.
 */
const CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "XAU", "XAG", "SGD", "HKD",
  "NOK", "SEK", "DKK", "ZAR", "TRY", "MXN", "CNH", "PLN", "BTC", "ETH",
]);

export function normalizeSymbol(raw: string): string {
  let s = raw.trim();
  if (/^[A-Z0-9]{3,}[a-z]{1,4}$/.test(s)) s = s.replace(/[a-z]+$/, "");
  s = s.toUpperCase();
  const stripped = s.replace(/[.\-_+#!].*$/, "") || s;
  // "XAUUSDM" / "EURUSDPRO" (MT4 menulis simbol huruf kecil semua): pair 6 huruf + akhiran broker.
  const pair = /^([A-Z]{3})([A-Z]{3})[A-Z]{1,3}$/.exec(stripped);
  if (pair && CURRENCIES.has(pair[1]) && CURRENCIES.has(pair[2])) return pair[1] + pair[2];
  return stripped.slice(0, 20);
}

function dateOf(datetime: string): string {
  const m = DATETIME_RE.exec(datetime.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/* ------------------------------------------------------------------ */
/* MT4 / MT5 HTML                                                      */
/* ------------------------------------------------------------------ */

/** Ambil isi tabel HTML jadi array baris berisi teks sel. Sel kosong berkelas "hidden" dibuang. */
export function htmlToRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table>|$)/gi;
  const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)(?=<\/t[dh]>|<t[dh]\b|<\/tr>|$)/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html))) {
    const cells: string[] = [];
    let cell: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cell = cellRe.exec(tr[1]))) {
      const attrs = cell[2];
      const text = decodeEntities(cell[3].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
      if (text === "" && /class\s*=\s*["']?[^"'>]*hidden/i.test(attrs)) continue;
      cells.push(text);
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * Baris posisi yang sudah ditutup, dikenali dari isinya (bukan posisi kolom tetap):
 * - ada 2 sel tanggal-waktu (open & close), dan sel tipe "buy"/"sell"
 * - sel setelah waktu close berisi harga close (angka)
 * MT4 (Closed Transactions): Ticket, Open Time, Type, Size, Item, Price, S/L, T/P, Close Time, Price, Commission, Taxes, Swap, Profit
 * MT5 (Positions):           Time, Position, Symbol, Type, Volume, Price, S/L, T/P, Time, Price, Commission, Swap, Profit
 * Bagian lain otomatis terlewati: Open Trades (tanpa close time), Deals (1 waktu), Orders (setelah waktu ada status, bukan harga),
 * pending order (tipe "buy limit"), dan baris balance.
 */
function parseStatementRow(cells: string[]): { row: ImportRow; format: "MT4" | "MT5" } | null | "invalid" {
  const dt = cells.map((c, i) => (DATETIME_RE.test(c) ? i : -1)).filter((i) => i >= 0);
  if (dt.length < 2) return null;
  const typeIdx = cells.findIndex((c) => /^(buy|sell)$/i.test(c));
  if (typeIdx < 0) return null;
  const [t1, t2] = dt;
  const exit = parseNumber(cells[t2 + 1]);
  if (exit === null) return null;

  const format: "MT4" | "MT5" = t1 === 0 ? "MT5" : "MT4";
  const id = format === "MT5" ? cells[1] : cells[0];
  const rawSymbol = format === "MT5" ? cells[typeIdx - 1] : cells[typeIdx + 2];
  const volume = cells[typeIdx + 1];
  const entry = parseNumber(format === "MT5" ? cells[typeIdx + 2] : cells[typeIdx + 3]);

  // Profit = angka terakhir di baris; angka di antara harga close dan profit = komisi/pajak/swap.
  const numericAfter = cells
    .slice(t2 + 2)
    .map(parseNumber)
    .filter((n): n is number => n !== null);
  if (!rawSymbol || entry === null || entry <= 0 || numericAfter.length === 0) return "invalid";
  const profit = numericAfter[numericAfter.length - 1];
  const costs = numericAfter.slice(0, -1).reduce((a, b) => a + b, 0);
  const pnl = Math.round((profit + costs) * 100) / 100;

  const symbol = normalizeSymbol(rawSymbol);
  const tradeDate = dateOf(cells[t2]);
  if (!symbol || !tradeDate) return "invalid";

  return {
    format,
    row: {
      symbol,
      side: cells[typeIdx].toLowerCase() === "buy" ? "BUY" : "SELL",
      entry_price: entry,
      exit_price: exit,
      pnl,
      pips: null, // dihitung server dari harga
      trade_date: tradeDate,
      session: null,
      notes: `Import ${format} #${id} · ${volume} lot · open ${cells[t1]} · close ${cells[t2]}`,
      confluence: null,
      strategy: null,
      emotion: null,
      followed_plan: null,
      external_id: id && /^\d+$/.test(id) ? `${format}-${id}` : null,
    },
  };
}

export function parseStatementHtml(html: string): ParseResult {
  const rows: ImportRow[] = [];
  let skipped = 0;
  let format: ImportFormat | null = null;
  for (const cells of htmlToRows(html)) {
    const parsed = parseStatementRow(cells);
    if (parsed === null) continue;
    if (parsed === "invalid") {
      skipped++;
      continue;
    }
    format ??= parsed.format;
    rows.push(parsed.row);
  }
  return { format, rows, skipped };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function parseCsvText(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  symbol: ["symbol", "item", "pair", "instrument", "market"],
  side: ["side", "type", "direction", "action"],
  entry: ["entry_price", "entry", "open price", "open_price", "price open", "entry price"],
  exit: ["exit_price", "exit", "close price", "close_price", "price close", "exit price"],
  pnl: ["pnl", "profit", "p&l", "profit/loss", "net profit", "net pnl", "p/l"],
  commission: ["commission", "commissions"],
  swap: ["swap", "swaps"],
  pips: ["pips"],
  date: ["trade_date", "close date", "close time", "close_time", "closed", "date", "time", "open date", "open time"],
  status: ["status"],
  session: ["session"],
  notes: ["notes", "note", "comment"],
  confluence: ["confluence"],
  strategy: ["strategy", "setup"],
  emotion: ["emotion"],
  followed: ["followed_plan", "followed plan", "sesuai rencana"],
  id: ["external_id", "ticket", "position id", "position", "order", "ticket id", "trade id", "id"],
};

function headerIndex(header: string[]): Record<string, number> {
  const norm = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));
  const out: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = norm.indexOf(alias);
      if (idx >= 0) {
        out[key] = idx;
        break;
      }
    }
  }
  return out;
}

/** Ubah berbagai format tanggal ke YYYY-MM-DD. dayFirst menentukan arti 01/02/2024. */
function parseCsvDate(raw: string, dayFirst: boolean): string {
  const s = raw.trim();
  let m = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/.exec(s);
  if (m) {
    const [d, mo] = dayFirst ? [m[1], m[2]] : [m[2], m[1]];
    if (Number(mo) > 12 || Number(d) > 31) return "";
    return `${m[3]}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

const SESSIONS = ["LONDON", "NEW_YORK", "ASIA", "OVERLAP"];

export function parseTradesCsv(text: string): ParseResult {
  const table = parseCsvText(text);
  if (table.length < 2) return { format: null, rows: [], skipped: 0 };
  const col = headerIndex(table[0]);
  if (col.symbol === undefined || col.side === undefined || col.entry === undefined) {
    return { format: null, rows: [], skipped: 0 };
  }
  const data = table.slice(1);
  const get = (r: string[], key: string) => (col[key] === undefined ? "" : (r[col[key]] ?? "").trim());

  // Tentukan urutan hari/bulan dari isi file: kalau ada bagian pertama > 12 berarti DD/MM.
  let dayFirst = true;
  for (const r of data) {
    const m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/]\d{4}/.exec(get(r, "date"));
    if (!m) continue;
    if (Number(m[1]) > 12) {
      dayFirst = true;
      break;
    }
    if (Number(m[2]) > 12) {
      dayFirst = false;
      break;
    }
  }

  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const r of data) {
    const sideRaw = get(r, "side").toLowerCase();
    const side = /^(buy|long)/.test(sideRaw) ? "BUY" : /^(sell|short)/.test(sideRaw) ? "SELL" : null;
    const entry = parseNumber(get(r, "entry").replace(",", "."));
    const exit = parseNumber(get(r, "exit").replace(",", "."));
    let pnl = parseNumber(get(r, "pnl").replace(",", "."));
    const pips = parseNumber(get(r, "pips").replace(",", "."));
    const symbol = normalizeSymbol(get(r, "symbol"));
    const tradeDate = parseCsvDate(get(r, "date"), dayFirst);

    // Baris seperti "balance"/"deposit" di export broker: lewati diam-diam.
    if (!side && /balance|deposit|withdraw|credit/.test(sideRaw)) continue;
    if (!side || !symbol || entry === null || entry <= 0 || !tradeDate) {
      skipped++;
      continue;
    }
    if (pnl !== null) {
      const commission = parseNumber(get(r, "commission").replace(",", ".")) ?? 0;
      const swap = parseNumber(get(r, "swap").replace(",", ".")) ?? 0;
      pnl = Math.round((pnl + commission + swap) * 100) / 100;
    }
    const statusRaw = get(r, "status").toUpperCase();
    const isOpen = statusRaw === "OPEN" || (exit === null && pnl === null);
    const session = get(r, "session").toUpperCase().replace(/\s+/g, "_");
    const emotion = get(r, "emotion").toUpperCase();
    const followed = get(r, "followed").toLowerCase();
    const id = get(r, "id");

    rows.push({
      symbol,
      side,
      entry_price: entry,
      exit_price: isOpen ? null : exit,
      pnl: isOpen ? null : pnl,
      pips,
      trade_date: tradeDate,
      session: SESSIONS.includes(session) ? session : null,
      notes: get(r, "notes") || null,
      confluence: get(r, "confluence") || null,
      strategy: get(r, "strategy") || null,
      emotion: (EMOTIONS as readonly string[]).includes(emotion) ? (emotion as Emotion) : null,
      followed_plan: ["yes", "ya", "true", "1"].includes(followed) ? true : ["no", "tidak", "false", "0"].includes(followed) ? false : null,
      // ID yang sudah berprefix (hasil export jurnal ini) dipakai apa adanya supaya import ulang tidak dobel.
      external_id: id ? (/^(MT4|MT5|CSV)-/.test(id) ? id : `CSV-${id}`).slice(0, 64) : null,
    });
  }
  return { format: "CSV", rows, skipped };
}

/** Pilih parser berdasarkan isi file. */
/**
 * Laporan statistik dari menu "Reports" MT5 (data di `window.__report`). Isinya hanya ringkasan
 * (profit per bulan/simbol), tanpa daftar trade, jadi tidak bisa di-import.
 */
export function isMt5SummaryReport(text: string): boolean {
  return /window\.__report\s*=/.test(text) && !/<(table|tr)\b/i.test(text);
}

export function parseImportFile(text: string): ParseResult {
  if (/<(table|tr)\b/i.test(text)) return parseStatementHtml(text);
  return parseTradesCsv(text);
}

/* ------------------------------------------------------------------ */
/* Export CSV                                                          */
/* ------------------------------------------------------------------ */

export const EXPORT_COLUMNS = [
  "trade_date",
  "symbol",
  "side",
  "entry_price",
  "exit_price",
  "pips",
  "pnl",
  "status",
  "session",
  "strategy",
  "emotion",
  "followed_plan",
  "confluence",
  "notes",
  "external_id",
] as const;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tradesToCsv(trades: Record<string, unknown>[]): string {
  const lines = [EXPORT_COLUMNS.join(",")];
  for (const t of trades) {
    lines.push(EXPORT_COLUMNS.map((c) => csvCell(t[c])).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
