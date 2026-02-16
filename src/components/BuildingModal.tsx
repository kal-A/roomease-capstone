"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface BuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onSelect: (value: string) => void;
  buildings: { value: string; label: string }[];
}

export function BuildingModal({
  isOpen,
  onClose,
  value,
  onSelect,
  buildings,
}: BuildingModalProps) {
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    if (!search.trim()) return buildings;
    const q = search.trim().toLowerCase();
    return buildings.filter(
      (b) => b.value.toLowerCase().includes(q) || b.label.toLowerCase().includes(q)
    );
  }, [buildings, search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="building-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-xl)]">
        <div className="flex shrink-0 flex-col gap-1 border-b border-[#2A2A2A] p-4">
          <h2 id="building-modal-title" className="text-lg font-semibold text-white">
            Select a Building
          </h2>
          <p className="text-sm text-gray-500">
            Showing {buildings.length} building{buildings.length !== 1 ? "s" : ""} (from dataset)
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-[#2A2A2A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD100]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 border-b border-[#2A2A2A]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buildings..."
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD100] focus:outline-none focus:ring-1 focus:ring-[#FFD100]"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {filtered.map((b) => {
              const isSelected = value === b.value;
              return (
                <button
                  key={b.value || "any"}
                  type="button"
                  onClick={() => {
                    onSelect(b.value);
                    onClose();
                  }}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-2 focus:ring-offset-[#1A1A1A] focus-visible:ring-2 ${
                    isSelected
                      ? "border-2 border-[#FFD100] bg-[#FFD100] text-black"
                      : "border border-[#2A2A2A] bg-[#111111] text-gray-400 hover:border-[#FFD100]/50 hover:text-white"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
