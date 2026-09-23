"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Wallet, Settings2 } from "lucide-react";
import { ManageAccountsModal } from "@/components/accounts/ManageAccountsModal";
import { setActiveAccount } from "@/app/(dashboard)/accounts/actions";
import type { TradingAccount } from "@/lib/types";

interface TradeSummary {
  account_id: string | null;
  pnl: number | null;
  status: string;
}

export function AccountControl({
  accounts,
  tradesSummary,
  activeAccountId,
}: {
  accounts: TradingAccount[];
  tradesSummary: TradeSummary[];
  activeAccountId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [manageOpen, setManageOpen] = useState(false);

  const activeId = searchParams.get("account") ?? activeAccountId ?? accounts[0]?.id;

  function handleChange(id: string) {
    // Simpan pilihan ke cookie supaya halaman lain (Reports, dst) ikut
    // pakai akun yang sama, meski ?account= di URL nggak ke-bawa ke sana.
    setActiveAccount(id);

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
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
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
        <button
          onClick={() => setManageOpen(true)}
          aria-label="Kelola Akun"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {manageOpen && (
        <ManageAccountsModal accounts={accounts} trades={tradesSummary} onClose={() => setManageOpen(false)} />
      )}
    </div>
  );
}
