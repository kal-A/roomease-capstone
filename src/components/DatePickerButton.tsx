"use client";

import { useState } from "react";
import { DatePickerModal } from "./DatePickerModal";

interface DatePickerButtonProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

function formatDisplayDate(yyyyMmDd: string): string {
  if (!yyyyMmDd || yyyyMmDd.length < 10) return "Select date";
  const [y, m, d] = yyyyMmDd.split("-");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[parseInt(m ?? "1", 10) - 1];
  return `${month} ${d}, ${y}`;
}

export function DatePickerButton({
  value,
  onChange,
  label = "Preferred Date",
  required = true,
}: DatePickerButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">
        {label} {required && <span className="text-[var(--primary)]">*</span>}
      </p>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[var(--textPrimary)] transition-all duration-150 hover:border-[var(--primaryBorder)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
      >
        {formatDisplayDate(value)}
      </button>
      <DatePickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        value={value}
        onSelect={(v) => {
          onChange(v);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
