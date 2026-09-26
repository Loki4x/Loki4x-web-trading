export type AssetCategory = "CURRENCY" | "COMMODITY" | "INDEX" | "CRYPTO";

const COMMODITY_SYMBOLS = new Set(["GOLD", "SILVER", "COPPER", "USOIL", "XAUUSD", "XAGUSD", "XTIUSD", "WTI"]);
const INDEX_SYMBOLS = new Set(["SPX", "NASDAQ", "DOW", "NIKKEI", "RUSSELL", "DAX", "FTSE", "US30", "US500", "NAS100"]);
const CRYPTO_SYMBOLS = new Set(["BITCOIN", "BTC", "BTCUSD", "ETH", "ETHUSD"]);

export function categorizeSymbol(symbol: string): AssetCategory {
  const s = symbol.toUpperCase();
  if (COMMODITY_SYMBOLS.has(s)) return "COMMODITY";
  if (INDEX_SYMBOLS.has(s)) return "INDEX";
  if (CRYPTO_SYMBOLS.has(s)) return "CRYPTO";
  return "CURRENCY"; // default: single currency (COT) atau pair forex (Retail Bias)
}

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  CURRENCY: "Currency",
  COMMODITY: "Commodity",
  INDEX: "Index",
  CRYPTO: "Crypto",
};

export type ContrarianSignal = "BEARISH" | "NEUTRAL" | "BULLISH";

/**
 * Sinyal kontrarian: mayoritas crowd long dibaca bearish, mayoritas
 * crowd short dibaca bullish. Ambang batasnya 60% (sama seperti referensi).
 */
export function getContrarianSignal(longPercent: number): ContrarianSignal {
  if (longPercent >= 60) return "BEARISH";
  if (longPercent <= 40) return "BULLISH";
  return "NEUTRAL";
}

export const SIGNAL_LABEL: Record<ContrarianSignal, string> = {
  BEARISH: "Contrarian Bearish",
  NEUTRAL: "Neutral",
  BULLISH: "Contrarian Bullish",
};
