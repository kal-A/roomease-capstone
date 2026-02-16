"use client";

import { useState } from "react";
import { BuildingModal } from "./BuildingModal";

interface BuildingButtonProps {
  value: string;
  onChange: (value: string) => void;
  buildings: { value: string; label: string }[];
  label?: string;
}

export function BuildingButton({
  value,
  onChange,
  buildings,
  label = "Preferred Building",
}: BuildingButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayLabel = value ? buildings.find((b) => b.value === value)?.label ?? value : "Any building";

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">{label}</p>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[var(--text)] transition-all duration-150 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
      >
        {displayLabel}
      </button>
      <BuildingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        value={value}
        onSelect={(v) => {
          onChange(v);
          setModalOpen(false);
        }}
        buildings={buildings}
      />
    </div>
  );
}
