import { LineChart } from "lucide-react";

export default function SignalsPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Signals & Track Record</h1>
        <p className="text-body-sm text-text-secondary">Sinyal trading dan rekam jejak performa.</p>
      </div>
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <LineChart className="h-10 w-10 text-text-muted" />
        <p className="text-body font-semibold text-text-primary">Segera Hadir</p>
        <p className="max-w-sm text-body-sm text-text-muted">
          Halaman ini sedang dalam pengembangan.
        </p>
      </div>
    </main>
  );
}
