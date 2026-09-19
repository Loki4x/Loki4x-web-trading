"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { cx } from "@/lib/utils";

type InstrumentType = "Forex" | "Commodity" | "Index" | "Crypto" | "Custom";
type MarginBasis = "quote" | "base"; // "quote": notional = lots × contractSize × price. "base": notional = lots × contractSize (price-independent, e.g. USD adalah base currency).

interface Instrument {
  symbol: string;
  type: InstrumentType;
  pipSize: number; // harga per 1 pip
  contractSize: number; // unit per 1.0 lot standard
  quoteIsUSD: boolean; // apakah mata uang quote = USD (pip value bisa langsung dihitung tanpa bagi harga)
  marginBasis: MarginBasis;
}

const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "GBPUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "AUDUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "NZDUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "USDJPY", type: "Forex", pipSize: 0.01, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "USDCHF", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "USDCAD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "XAUUSD", type: "Commodity", pipSize: 0.01, contractSize: 100, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "XAGUSD", type: "Commodity", pipSize: 0.001, contractSize: 5_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "US30", type: "Index", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "NAS100", type: "Index", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "BTCUSD", type: "Crypto", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "CUSTOM", type: "Custom", pipSize: 0.0001, contractSize: 0, quoteIsUSD: true, marginBasis: "quote" },
];

const QUICK_BALANCES = [5_000, 10_000, 25_000, 50_000];
const RISK_LEVELS = [0.5, 1, 2, 3];
const LEVERAGE_PRESETS = [2, 5, 10, 20, 30, 50, 100];

function riskLabel(percent: number) {
  if (percent <= 0.5) return { label: "Sangat Konservatif", color: "text-success", bar: "bg-success" };
  if (percent <= 1) return { label: "Konservatif", color: "text-success", bar: "bg-success" };
  if (percent <= 2) return { label: "Moderat", color: "text-warning", bar: "bg-warning" };
  if (percent <= 3) return { label: "Agresif", color: "text-error", bar: "bg-error" };
  return { label: "Sangat Agresif", color: "text-error", bar: "bg-error" };
}

function fmt(n: number | null, digits = 2) {
  if (n === null || Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function LotCalculator() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("SHORT");
  const [balance, setBalance] = useState("400");
  const [riskPercent, setRiskPercent] = useState("0.5");
  const [leverage, setLeverage] = useState("100");
  const [entry, setEntry] = useState("4379");
  const [slMode, setSlMode] = useState<"PRICE" | "PIPS">("PIPS");
  const [slValue, setSlValue] = useState("20");
  const [tpMode, setTpMode] = useState<"PRICE" | "PIPS" | "RR">("PIPS");
  const [tpValue, setTpValue] = useState("450");
  const [customPipSize, setCustomPipSize] = useState("0.0001");
  const [customPipValue, setCustomPipValue] = useState("10");
  const [customContractSize, setCustomContractSize] = useState("");
  const [copied, setCopied] = useState(false);

  const instrument = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];
  const isCustom = instrument.type === "Custom";

  const calc = useMemo(() => {
    const b = parseFloat(balance);
    const r = parseFloat(riskPercent);
    const lev = parseFloat(leverage);
    const e = parseFloat(entry);
    const pipSize = isCustom ? parseFloat(customPipSize) : instrument.pipSize;

    if (!b || b <= 0 || !r || r <= 0 || !pipSize || pipSize <= 0) return null;

    // Pip value per 1.0 lot standard, dalam USD
    let pipValuePerLot: number | null;
    if (isCustom) {
      pipValuePerLot = parseFloat(customPipValue) || null;
    } else if (instrument.quoteIsUSD) {
      pipValuePerLot = pipSize * instrument.contractSize;
    } else {
      pipValuePerLot = e > 0 ? (pipSize * instrument.contractSize) / e : null;
    }

    // Stop Loss → jarak dalam pips & harga
    const slRaw = parseFloat(slValue);
    if (!slRaw || slRaw <= 0 || !e) return null;

    let slPips: number;
    let slPrice: number;
    if (slMode === "PIPS") {
      slPips = slRaw;
      slPrice = direction === "LONG" ? e - slPips * pipSize : e + slPips * pipSize;
    } else {
      slPrice = slRaw;
      slPips = Math.abs(direction === "LONG" ? (e - slPrice) / pipSize : (slPrice - e) / pipSize);
    }
    const slOnWrongSide =
      (direction === "LONG" && slPrice >= e) || (direction === "SHORT" && slPrice <= e);

    // Take Profit (opsional)
    let tpPips: number | null = null;
    let tpPrice: number | null = null;
    const tpRaw = parseFloat(tpValue);
    if (tpRaw && tpRaw > 0) {
      if (tpMode === "PIPS") {
        tpPips = tpRaw;
        tpPrice = direction === "LONG" ? e + tpPips * pipSize : e - tpPips * pipSize;
      } else if (tpMode === "PRICE") {
        tpPrice = tpRaw;
        tpPips = Math.abs(direction === "LONG" ? (tpPrice - e) / pipSize : (e - tpPrice) / pipSize);
      } else {
        tpPips = slPips * tpRaw;
        tpPrice = direction === "LONG" ? e + tpPips * pipSize : e - tpPips * pipSize;
      }
    }

    const riskAmount = b * (r / 100);
    const lotSize = pipValuePerLot ? riskAmount / (slPips * pipValuePerLot) : null;
    const rr = tpPips ? tpPips / slPips : null;
    const potentialProfit = lotSize && tpPips && pipValuePerLot ? lotSize * tpPips * pipValuePerLot : null;

    const contractSize = isCustom ? parseFloat(customContractSize) || null : instrument.contractSize;
    let estMargin: number | null = null;
    if (lotSize && contractSize && lev > 0) {
      const notional = instrument.marginBasis === "quote" ? lotSize * contractSize * e : lotSize * contractSize;
      estMargin = notional / lev;
    }

    return {
      pipValuePerLot,
      slPips,
      slPrice,
      slOnWrongSide,
      tpPips,
      tpPrice,
      riskAmount,
      lotSize,
      rr,
      potentialProfit,
      estMargin,
      leverage: lev,
    };
  }, [
    balance,
    riskPercent,
    leverage,
    entry,
    direction,
    slMode,
    slValue,
    tpMode,
    tpValue,
    isCustom,
    customPipSize,
    customPipValue,
    customContractSize,
    instrument,
  ]);

  const risk = riskLabel(parseFloat(riskPercent) || 0);

  function copyLotSize() {
    if (!calc?.lotSize) return;
    navigator.clipboard.writeText(calc.lotSize.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function segmentBtn(active: boolean) {
    return cx(
      "rounded-md px-2.5 py-1 text-caption font-semibold transition-colors",
      active ? "bg-primary text-text-on-primary" : "text-text-secondary hover:text-text-primary"
    );
  }

  function pillBtn(active: boolean) {
    return cx(
      "rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors",
      active
        ? "border-primary bg-primary-subtle text-primary"
        : "border-border text-text-secondary hover:bg-surface-hover"
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* LEFT: inputs */}
      <div className="card flex flex-col gap-5">
        <div>
          <label className="text-body-sm font-medium text-text-secondary">Instrument</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="input-field mt-2">
            {INSTRUMENTS.map((i) => (
              <option key={i.symbol} value={i.symbol}>
                {i.symbol === "CUSTOM" ? "Custom (isi manual)" : i.symbol}
              </option>
            ))}
          </select>
          {!isCustom && (
            <p className="mt-1 text-caption text-text-muted">
              Pip: {instrument.pipSize} · Tipe: {instrument.type}
            </p>
          )}
        </div>

        {isCustom && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-2 p-3 sm:grid-cols-3">
            <div>
              <label className="text-caption text-text-secondary">Pip Size</label>
              <input
                type="number"
                value={customPipSize}
                onChange={(e) => setCustomPipSize(e.target.value)}
                className="input-field mt-1 py-2"
              />
            </div>
            <div>
              <label className="text-caption text-text-secondary">Pip Value / lot ($)</label>
              <input
                type="number"
                value={customPipValue}
                onChange={(e) => setCustomPipValue(e.target.value)}
                className="input-field mt-1 py-2"
              />
            </div>
            <div>
              <label className="text-caption text-text-secondary">Contract Size (opsional)</label>
              <input
                type="number"
                value={customContractSize}
                onChange={(e) => setCustomContractSize(e.target.value)}
                placeholder="buat estimasi margin"
                className="input-field mt-1 py-2"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-body-sm font-medium text-text-secondary">Direction</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("LONG")}
              className={cx(
                "rounded-lg border px-4 py-2.5 text-body-sm font-semibold transition-colors",
                direction === "LONG"
                  ? "border-success bg-success-subtle text-success"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              )}
            >
              ↑ Long
            </button>
            <button
              type="button"
              onClick={() => setDirection("SHORT")}
              className={cx(
                "rounded-lg border px-4 py-2.5 text-body-sm font-semibold transition-colors",
                direction === "SHORT"
                  ? "border-error bg-error-subtle text-error"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              )}
            >
              ↓ Short
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-body-sm font-medium text-text-secondary">Balance ($)</label>
            <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="input-field mt-2" />
          </div>
          <div>
            <label className="text-body-sm font-medium text-text-secondary">Risk (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="input-field mt-2"
            />
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Quick Balance</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_BALANCES.map((v) => (
              <button key={v} type="button" onClick={() => setBalance(String(v))} className={pillBtn(balance === String(v))}>
                ${v / 1000}k
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Risk Level</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RISK_LEVELS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRiskPercent(String(v))}
                className={pillBtn(riskPercent === String(v))}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Leverage</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5">
              <span className="text-body-sm text-text-muted">1 :</span>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-14 bg-transparent text-body-sm text-text-primary outline-none"
              />
            </div>
            {LEVERAGE_PRESETS.map((v) => (
              <button key={v} type="button" onClick={() => setLeverage(String(v))} className={pillBtn(leverage === String(v))}>
                1:{v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-body-sm font-medium text-text-secondary">Entry Price</label>
          <input type="number" value={entry} onChange={(e) => setEntry(e.target.value)} className="input-field mt-2" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-medium text-error">Stop Loss</label>
            <div className="flex rounded-lg border border-border p-0.5">
              <button type="button" onClick={() => setSlMode("PRICE")} className={segmentBtn(slMode === "PRICE")}>
                Price
              </button>
              <button type="button" onClick={() => setSlMode("PIPS")} className={segmentBtn(slMode === "PIPS")}>
                Pips
              </button>
            </div>
          </div>
          <div className="relative mt-2">
            <input type="number" value={slValue} onChange={(e) => setSlValue(e.target.value)} className="input-field" />
            {slMode === "PIPS" && (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-caption text-text-muted">
                pips
              </span>
            )}
          </div>
          {calc && (
            <p className="mt-1 text-caption text-text-muted">
              {slMode === "PIPS" ? `= ${fmt(calc.slPrice, isCustom ? 5 : 3)}` : `= ${fmt(calc.slPips, 1)} pips`}
              {calc.slOnWrongSide && (
                <span className="ml-2 text-warning">⚠ SL ada di sisi yang salah buat {direction}</span>
              )}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-medium text-success">Take Profit (opsional)</label>
            <div className="flex rounded-lg border border-border p-0.5">
              <button type="button" onClick={() => setTpMode("PRICE")} className={segmentBtn(tpMode === "PRICE")}>
                Price
              </button>
              <button type="button" onClick={() => setTpMode("PIPS")} className={segmentBtn(tpMode === "PIPS")}>
                Pips
              </button>
              <button type="button" onClick={() => setTpMode("RR")} className={segmentBtn(tpMode === "RR")}>
                R:R
              </button>
            </div>
          </div>
          <div className="relative mt-2">
            <input type="number" value={tpValue} onChange={(e) => setTpValue(e.target.value)} className="input-field" />
            {tpMode !== "PRICE" && (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-caption text-text-muted">
                {tpMode === "RR" ? "x SL" : "pips"}
              </span>
            )}
          </div>
          {calc && calc.tpPrice !== null && (
            <p className="mt-1 text-caption text-text-muted">
              {tpMode === "PRICE" ? `= ${fmt(calc.tpPips, 1)} pips` : `= ${fmt(calc.tpPrice, isCustom ? 5 : 3)}`}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: outputs */}
      <div className="flex flex-col gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Position Size</p>
            <button
              type="button"
              onClick={copyLotSize}
              disabled={!calc?.lotSize}
              className="flex items-center gap-1.5 text-caption font-medium text-primary hover:underline disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Tersalin!" : "Copy"}
            </button>
          </div>
          <p className="mt-1 text-h1 font-display font-extrabold text-primary">
            {calc?.lotSize ? calc.lotSize.toFixed(2) : "—"} <span className="text-body font-medium text-text-muted">lots</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
              <p className="text-caption text-text-muted">Standard</p>
              <p className="text-body-sm font-semibold text-text-primary">{calc?.lotSize ? calc.lotSize.toFixed(2) : "—"}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
              <p className="text-caption text-text-muted">Mini</p>
              <p className="text-body-sm font-semibold text-text-primary">
                {calc?.lotSize ? (calc.lotSize * 10).toFixed(1) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
              <p className="text-caption text-text-muted">Micro</p>
              <p className="text-body-sm font-semibold text-text-primary">
                {calc?.lotSize ? (calc.lotSize * 100).toFixed(1) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Risk Exposure</p>
            <span className={cx("text-caption font-semibold", risk.color)}>{risk.label}</span>
          </div>
          <p className="mt-1 text-h3 text-text-primary">
            {riskPercent || 0}% <span className="text-body-sm text-text-muted">({calc ? fmt(calc.riskAmount) : "—"})</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={cx("h-full rounded-full transition-all", risk.bar)}
              style={{ width: `${Math.min(100, ((parseFloat(riskPercent) || 0) / 5) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-caption text-text-muted">
            <span>0%</span>
            <span>5%</span>
          </div>
        </div>

        {calc && (
          <div className="card">
            <div className="flex items-center justify-between">
              <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Trade Preview</p>
              {calc.rr && (
                <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-caption font-semibold text-primary">
                  R:R 1:{calc.rr.toFixed(1)}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {calc.tpPrice !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    <div>
                      <p className="text-caption text-text-muted">Take Profit</p>
                      <p className="text-body-sm font-semibold text-text-primary">{fmt(calc.tpPrice, isCustom ? 5 : 3)}</p>
                    </div>
                  </div>
                  <span className="text-body-sm font-semibold text-success">+{fmt(calc.tpPips, 1)} pips</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <div>
                    <p className="text-caption text-text-muted">Entry</p>
                    <p className="text-body-sm font-semibold text-text-primary">{fmt(parseFloat(entry) || 0, isCustom ? 5 : 3)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-error" />
                  <div>
                    <p className="text-caption text-text-muted">Stop Loss</p>
                    <p className="text-body-sm font-semibold text-text-primary">{fmt(calc.slPrice, isCustom ? 5 : 3)}</p>
                  </div>
                </div>
                <span className="text-body-sm font-semibold text-error">-{fmt(calc.slPips, 1)} pips</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-caption text-text-muted">Risk Amount</p>
            <p className="mt-1 text-body font-semibold text-text-primary">{calc ? fmt(calc.riskAmount) : "—"}</p>
            <p className="text-caption text-text-muted">{riskPercent || 0}% dari balance</p>
          </div>
          <div className="card">
            <p className="text-caption text-text-muted">Pip Value</p>
            <p className="mt-1 text-body font-semibold text-text-primary">
              {calc?.pipValuePerLot ? fmt(calc.pipValuePerLot) : "—"}
            </p>
            <p className="text-caption text-text-muted">per lot per pip</p>
          </div>
          <div className="card">
            <p className="text-caption text-text-muted">Pips at Risk</p>
            <p className="mt-1 text-body font-semibold text-error">{calc ? fmt(calc.slPips, 1) : "—"}</p>
            <p className="text-caption text-text-muted">ke stop loss</p>
          </div>
          <div className="card">
            <p className="text-caption text-text-muted">Pips to Target</p>
            <p className="mt-1 text-body font-semibold text-success">{calc?.tpPips ? fmt(calc.tpPips, 1) : "—"}</p>
            <p className="text-caption text-text-muted">ke take profit</p>
          </div>
          <div className="card">
            <p className="text-caption text-text-muted">Est. Margin</p>
            <p className="mt-1 text-body font-semibold text-text-primary">{calc?.estMargin ? fmt(calc.estMargin) : "—"}</p>
            <p className="text-caption text-text-muted">di leverage 1:{leverage || "-"}</p>
          </div>
          <div className="card">
            <p className="text-caption text-text-muted">Potential Profit</p>
            <p className="mt-1 text-body font-semibold text-success">
              {calc?.potentialProfit ? fmt(calc.potentialProfit) : "—"}
            </p>
            <p className="text-caption text-text-muted">kalau TP kena</p>
          </div>
        </div>

        <p className="text-caption text-text-muted">
          Kalkulator ini pakai asumsi kontrak standar yang umum dipakai broker. Nilai pip &amp; margin untuk indeks,
          kripto, dan pair custom bisa berbeda tergantung broker kamu — selalu cek spesifikasi kontrak brokermu
          sebelum entry.
        </p>
      </div>
    </div>
  );
}
