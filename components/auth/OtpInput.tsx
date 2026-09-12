"use client";

import { useRef, useState } from "react";

export function OtpInput({ length = 6 }: { length?: number }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    if (!pasted) return;
    const newValues = Array(length).fill("");
    pasted.split("").forEach((char, i) => {
      newValues[i] = char;
    });
    setValues(newValues);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div>
      <input type="hidden" name="token" value={values.join("")} />
      <div className="flex justify-between gap-2">
        {values.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="h-14 w-12 rounded-lg border border-border bg-surface-2 text-center text-2xl font-semibold text-text-primary focus:border-primary focus:outline-none"
          />
        ))}
      </div>
    </div>
  );
}
