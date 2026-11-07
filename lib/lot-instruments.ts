// Daftar instrumen kalkulator lot. Dipakai kalkulator dan tombol "Hitung lot" di halaman Signals.

export type InstrumentType = "Forex" | "Commodity" | "Index" | "Crypto" | "Custom";
export type MarginBasis = "quote" | "base"; // "quote": notional = lots × contractSize × price. "base": notional = lots × contractSize (price-independent, e.g. USD adalah base currency).

export interface Instrument {
  symbol: string;
  type: InstrumentType;
  pipSize: number; // harga per 1 pip
  contractSize: number; // unit per 1.0 lot standard
  quoteIsUSD: boolean; // apakah mata uang quote = USD (pip value bisa langsung dihitung tanpa bagi harga)
  marginBasis: MarginBasis;
}

export const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "GBPUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "AUDUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "NZDUSD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "USDJPY", type: "Forex", pipSize: 0.01, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "USDCHF", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "USDCAD", type: "Forex", pipSize: 0.0001, contractSize: 100_000, quoteIsUSD: false, marginBasis: "base" },
  { symbol: "XAUUSD", type: "Commodity", pipSize: 0.1, contractSize: 100, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "XAGUSD", type: "Commodity", pipSize: 0.001, contractSize: 5_000, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "US30", type: "Index", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "NAS100", type: "Index", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "BTCUSD", type: "Crypto", pipSize: 1, contractSize: 1, quoteIsUSD: true, marginBasis: "quote" },
  { symbol: "CUSTOM", type: "Custom", pipSize: 0.0001, contractSize: 0, quoteIsUSD: true, marginBasis: "quote" },
];

