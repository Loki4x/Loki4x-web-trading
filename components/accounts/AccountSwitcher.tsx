"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Wallet } from "lucide-react";
import type { TradingAccount } from "@/lib/types";

export function AccountSwitcher({ accounts }: { accounts: TradingAccount[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (accounts.length <= 1) return null;

  const activeId = searchParams.get("account") ?? accounts[0]?.id;

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("account", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 px-1">
      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
        <Wallet className="h-3 w-3" />
        Akun Aktif
      </label>
      <div className="relative">
        <select
          value={activeId}
          onChange={(e) => handleChange(e.target.value)}
          className="input-field w-full appearance-none !py-2 pr-8 text-[11px]"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}
