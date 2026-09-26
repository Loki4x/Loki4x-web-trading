import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AccountCurrency } from "@/lib/types";
import { categorizeSymbol } from "@/lib/asset-category";

export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format harga entry/exit sesuai jenis simbolnya, supaya tidak selalu
 * menampilkan 5 angka desimal (yang cocok untuk forex, tapi berlebihan
 * untuk gold/index/crypto seperti XAUUSD -> 4370.00000).
 */
export function formatPrice(price: number, symbol: string): string {
  const category = categorizeSymbol(symbol);

  if (category === "COMMODITY" || category === "INDEX" || category === "CRYPTO") {
    return price.toFixed(2);
  }

  // CURRENCY (forex): pair yang mengandung JPY biasanya dikutip dengan
  // lebih sedikit desimal (mis. 150.123) dibanding pair lain (1.23456).
  if (symbol.toUpperCase().includes("JPY")) {
    return price.toFixed(3);
  }

  return price.toFixed(5);
}

export function formatCurrency(value: number, currency: AccountCurrency = "USD"): string {
  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value);

  if (currency === "IDR") {
    return `${sign}Rp${abs.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPlainCurrency(value: number, currency: AccountCurrency = "USD"): string {
  if (currency === "IDR") {
    return `Rp${value.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatTime(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pnlColorClass(value: number): string {
  return value >= 0 ? "text-success" : "text-error";
}

export function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return new Date(dateString).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
