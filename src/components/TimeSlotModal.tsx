"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { TIME_SLOTS_30MIN } from "@/types/booking";

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onSelect: (value: string) => void;
}

export function TimeSlotModal({
  isOpen,
  onClose,
  value,
  onSelect,
}: TimeSlotModalProps) {
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

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-slot-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)]" style={{ borderWidth: "1px" }}>
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0">
          <h2 id="time-slot-modal-title" className="text-lg font-semibold text-[var(--text)]">Select a Time Slot</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--textSecondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS_30MIN.map((slot) => {
              const isSelected = value === slot.value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => { onSelect(slot.value); onClose(); }}
                  className={`min-w-0 rounded-lg px-2 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                    isSelected ? "border-2 border-[var(--primary)] bg-[var(--primary)] text-black" : "border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--gold-border)] hover:text-[var(--text)]"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-[var(--border)] p-4 shrink-0">
          <button type="button" onClick={onClose} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 font-medium text-[var(--textSecondary)] hover:text-[var(--text)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}
