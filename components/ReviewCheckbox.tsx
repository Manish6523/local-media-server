"use client";

import { Check, Minus } from "lucide-react";

export default function ReviewCheckbox({ checked, mixed = false, label, onChange }: {
  checked: boolean;
  mixed?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      onClick={() => onChange(mixed || !checked)}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111114]"
    >
      <span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-lg border transition duration-150 motion-reduce:transition-none ${checked || mixed
        ? "border-red-400/70 bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.2)] group-hover:bg-red-400"
        : "border-white/20 bg-white/[0.035] shadow-inner group-hover:border-white/45 group-hover:bg-white/10"}`}>
        {mixed ? <Minus size={15} strokeWidth={3} /> : checked ? <Check size={15} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
