import Link from "next/link";
import { Check, Circle } from "lucide-react";

interface Step {
  label: string;
  description: string;
  done: boolean;
  href: string;
}

export function OnboardingChecklist({ steps }: { steps: Step[] }) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="card mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-h3 text-text-primary">Langkah Awal</h2>
        <span className="text-body-sm text-text-muted">{doneCount}/{steps.length}</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-col gap-1">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover"
          >
            {step.done ? (
              <Check className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-text-muted" />
            )}
            <div>
              <p className={`text-body-sm font-medium ${step.done ? "text-text-muted line-through" : "text-text-primary"}`}>
                {step.label}
              </p>
              <p className="text-caption text-text-muted">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
