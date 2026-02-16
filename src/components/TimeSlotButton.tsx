"use client";

import { useState } from "react";
import { formatTimeSlot } from "@/types/booking";
import { TimeSlotModal } from "./TimeSlotModal";

interface TimeSlotButtonProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
}

export function TimeSlotButton({
  value,
  onChange,
  id = "timeSlot",
  label = "Preferred Time Slot",
  required = true,
}: TimeSlotButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">
        {label} {required && <span className="text-[var(--primary)]">*</span>}
      </p>
      <button
        id={id}
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[var(--text)] transition-all duration-150 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
      >
        {value ? formatTimeSlot(value) : "Choose Time Slot"}
      </button>
      <TimeSlotModal
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
