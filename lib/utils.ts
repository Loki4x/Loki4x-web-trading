import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AccountCurrency } from "@/lib/types";

export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
