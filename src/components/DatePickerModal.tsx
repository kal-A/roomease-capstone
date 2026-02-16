"use client";

import { useCallback, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onSelect: (yyyyMmDd: string) => void;
}

function toDate(str: string): Date | undefined {
  if (!str || str.length < 10) return undefined;
  const d = new Date(str + "T12:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePickerModal({
  isOpen,
  onClose,
  value,
  onSelect,
}: DatePickerModalProps) {
  const selected = toDate(value);
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-picker-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)] p-6"
        style={{ borderWidth: "1px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-4">
          <h2 id="date-picker-title" className="text-lg font-semibold tracking-tight text-[var(--text)]">Select date</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--textSecondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="rdp-root mx-auto [--rdp-accent-color:var(--primary)] [--rdp-accent-background-color:var(--gold-subtle)] [--rdp-today-color:var(--primary)]" style={{ color: "var(--text)" }}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) onSelect(toYyyyMmDd(d));
              onClose();
            }}
            required
          />
        </div>
      </div>
    </div>
  );
}
