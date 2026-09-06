"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

export function LotCalculator() {
  const [balance, setBalance] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [stopLossPips, setStopLossPips] = useState("20");
  const [pipValue, setPipValue] = useState("10");

  const result = useMemo(() => {
    const b = parseFloat(balance);
    const r = parseFloat(riskPercent);
    const sl = parseFloat(stopLossPips);
    const pv = parseFloat(pipValue);

    if (!b || !r || !sl || !pv || b <= 0 || r <= 0 || sl <= 0 || pv <= 0) return null;

    const riskAmount = b * (r / 100);
    const lotSize = riskAmount / (sl * pv);

    return { riskAmount, lotSize };
  }, [balance, riskPercent, stopLossPips, pipValue]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card flex flex-col gap-4">
        <h3 className="text-body font-semibold text-text-primary">Input</h3>

        <Input
          label="Account Balance ($)"
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <Input
          label="Risk per Trade (%)"
          type="number"
          step="0.1"
          value={riskPercent}
          onChange={(e) => setRiskPercent(e.target.value)}
        />
        <Input
          label="Stop Loss (pips)"
          type="number"
          value={stopLossPips}
          onChange={(e) => setStopLossPips(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Pip Value per Standard Lot ($)"
            type="number"
            step="0.01"
            value={pipValue}
            onChange={(e) => setPipValue(e.target.value)}
          />
          <p className="text-caption text-text-muted">
            Umumnya $10 untuk pair mayor (XXX/USD). Cek broker kamu untuk pair lain (mis. XAUUSD, JPY pairs).
          </p>
        </div>
      </div>

      <div className="card flex flex-col justify-center gap-6">
        <h3 className="text-body font-semibold text-text-primary">Hasil</h3>

        {result ? (
          <>
            <div>
              <p className="text-caption text-text-secondary">Risk Amount</p>
              <p className="text-h2 text-error">{formatCurrency(-result.riskAmount)}</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Recommended Lot Size</p>
              <p className="text-h1 text-primary">{result.lotSize.toFixed(2)}</p>
              <p className="mt-1 text-caption text-text-muted">lot (standard)</p>
            </div>
          </>
        ) : (
          <p className="text-body-sm text-text-muted">Isi semua kolom dengan angka yang valid.</p>
        )}
      </div>
    </div>
  );
}
