"use client";

import { EVENT_TYPES } from "@/types/booking";

interface EventTypeSelectorProps {
  value: string;
  customValue: string;
  onChange: (value: string, customValue?: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
}

export function EventTypeSelector({
  value,
  customValue,
  onChange,
  id = "eventType",
  label = "Event Type",
  required = true,
}: EventTypeSelectorProps) {
  const isOther = value === "Other";

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">
        {label} {required && <span className="text-[var(--primary)]">*</span>}
      </p>
      <div
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus-within:ring-1 focus-within:ring-[var(--focusRing)]"
        role="group"
        aria-label={label}
      >
        {EVENT_TYPES.map((type) => {
          const isSelected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                isSelected
                  ? "border-2 border-[var(--primary)] bg-[var(--primary)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text)]"
              }`}
              style={isSelected ? { color: "var(--primaryText)" } : undefined}
            >
              {type.label}
            </button>
          );
        })}
      </div>
      {isOther && (
        <div className="mt-3 overflow-hidden transition-[max-height] duration-200 ease-out" style={{ maxHeight: "80px" }}>
          <label htmlFor={`${id}-custom`} className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">
            Specify event type <span className="text-[var(--primary)]">*</span>
          </label>
          <input
            id={`${id}-custom`}
            type="text"
            value={customValue}
            onChange={(e) => onChange("Other", e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
            placeholder="e.g., Office hours, thesis defense..."
          />
        </div>
      )}
    </div>
  );
}
