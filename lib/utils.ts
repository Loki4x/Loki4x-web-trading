import { dateLocale, translate, type Locale } from "@/lib/i18n/dictionary";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { AccountCurrency } from "@/lib/types";
import { categorizeSymbol } from "@/lib/asset-category";

// tailwind-merge nggak tahu token ukuran font kustom dari tailwind.config.ts
// (text-caption, text-badge, text-h2, dst) dan mengiranya warna teks. Akibatnya,
// kalau di cx() yang sama ada kelas warna (text-success, text-text-secondary, ...),
// ukuran fontnya ikut terhapus diam-diam dan teks jatuh ke ukuran bawaan 16px.
// Daftar di bawah HARUS sama dengan `fontSize` di tailwind.config.ts.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body-lg", "body", "body-sm", "caption", "badge"] },
      ],
    },
  },
});

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

/**
 * Nilai untuk <input type="datetime-local"> ("YYYY-MM-DDTHH:mm"), selalu dalam
 * WIB (Asia/Jakarta) — apa pun zona waktu perangkat admin. Server membaca input
 * itu sebagai WIB juga (lihat parseWibDateTime di app/admin/actions.ts), jadi
 * keduanya selalu konsisten.
 */
export function nowWibInputValue(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
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

export function formatRelativeTime(dateString: string, locale: Locale = "id"): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.round(diffMs / 60000);

  const tr = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  if (diffMin < 1) return tr("Baru saja");
  if (diffMin < 60) return tr("{n} menit lalu", { n: diffMin });

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return tr("{n} jam lalu", { n: diffHour });

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return tr("{n} hari lalu", { n: diffDay });

  return new Date(dateString).toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric" });
}
