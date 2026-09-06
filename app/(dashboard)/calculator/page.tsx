import { LotCalculator } from "@/components/calculator/LotCalculator";

export default function CalculatorPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Lot Calculator</h1>
        <p className="text-body-sm text-text-secondary">Hitung ukuran lot berdasarkan manajemen risiko kamu.</p>
      </div>

      <LotCalculator />
    </main>
  );
}
