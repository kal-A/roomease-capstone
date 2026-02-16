"use client";

import { useState } from "react";
import type { AvNeedKey } from "@/types/booking";
import type { EventFormData } from "@/types/booking";
import {
  AV_NEED_OPTIONS,
  DURATION_CUSTOM_MAX,
  DURATION_CUSTOM_MIN,
  DURATION_PRESETS,
  PRIORITY_LEVELS,
  formatDuration,
} from "@/types/booking";
import { FURNITURE_LABELS } from "@/lib/furniture";
import { BuildingButton } from "./BuildingButton";
import { DatePickerButton } from "./DatePickerButton";
import { EventTypeSelector } from "./EventTypeSelector";
import { TimeSlotButton } from "./TimeSlotButton";
import { TimeBar } from "./TimeBar";

interface EventFormProps {
  data: EventFormData;
  onChange: (data: EventFormData) => void;
  onSubmit: () => void;
  buildings: { value: string; label: string }[];
  /** When true, show only: Event Name, Organizer, Date, Time, Duration, Group Size. CTA: "Confirm Booking". */
  directBooking?: boolean;
  /** Room ID for availability checking (when booking a specific room) */
  roomId?: string | number;
  /** Existing bookings for availability checking */
  existingBookings?: { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number }[];
}

const defaultFormData: Partial<EventFormData> = {
  eventName: "",
  organizerName: "",
  preferredDate: "",
  timeSlot: "",
  groupSize: 0,
  eventType: "",
  durationMinutes: 60,
  avNeedsEnabled: false,
  avNeeds: [],
  furnitureNeedsEnabled: false,
  furnitureNeeds: [],
  preferredBuilding: "",
  priorityLevel: "Medium",
};

const CUSTOM_HOURS = [0, 1, 2, 3, 4, 5, 6];
const CUSTOM_MINUTES = [0, 15, 30, 45];

export function EventForm({ data, onChange, onSubmit, buildings, directBooking, roomId, existingBookings = [] }: EventFormProps) {
  const formData = { ...defaultFormData, ...data };
  const durationMin = formData.durationMinutes ?? 60;
  const isPreset = DURATION_PRESETS.some((p) => p.value === durationMin);
  const [isCustomDuration, setIsCustomDuration] = useState(!isPreset);
  const customHours = Math.floor(durationMin / 60);
  const customMinutes = durationMin % 60;
  const avNeeds = formData.avNeeds ?? [];
  const furnitureNeeds = formData.furnitureNeeds ?? [];
  const furnitureOptions = Object.values(FURNITURE_LABELS);

  const set = (
    key: keyof EventFormData,
    value: string | number | boolean | AvNeedKey[] | string[] | undefined
  ) => {
    onChange({ ...formData, [key]: value });
  };

  const toggleAvNeed = (key: AvNeedKey) => {
    if (key === "none") {
      set("avNeeds", []);
      return;
    }
    const next = avNeeds.includes(key) ? avNeeds.filter((n) => n !== key) : [...avNeeds.filter((n) => n !== "none"), key];
    set("avNeeds", next);
  };

  /** Single-select: choosing an option sets it; clicking again clears. */
  const setFurnitureNeed = (label: string) => {
    const next = furnitureNeeds.includes(label) ? [] : [label];
    set("furnitureNeeds", next);
  };

  const setCustomDuration = (hours: number, minutes: number) => {
    const total = hours * 60 + minutes;
    const clamped = Math.max(DURATION_CUSTOM_MIN, Math.min(DURATION_CUSTOM_MAX, total));
    set("durationMinutes", clamped);
  };

  const isEventTypeValid =
    formData.eventType !== "" &&
    (formData.eventType !== "Other" || (formData.eventTypeCustom ?? "").trim() !== "");
  const durationValid =
    durationMin >= DURATION_CUSTOM_MIN && durationMin <= DURATION_CUSTOM_MAX;
  const isValid = directBooking
    ? (formData.eventName?.trim() ?? "") !== "" &&
      (formData.organizerName?.trim() ?? "") !== "" &&
      (formData.preferredDate ?? "") !== "" &&
      (formData.timeSlot ?? "") !== "" &&
      (formData.groupSize ?? 0) > 0 &&
      durationValid
    : (formData.eventName?.trim() ?? "") !== "" &&
      (formData.organizerName?.trim() ?? "") !== "" &&
      (formData.preferredDate ?? "") !== "" &&
      (formData.timeSlot ?? "") !== "" &&
      (formData.groupSize ?? 0) > 0 &&
      isEventTypeValid &&
      durationValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit();
  };

  const inputClass =
    "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-3.5 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] transition-all duration-200";
  const labelClass = "mb-2 block text-sm font-medium text-[var(--textSecondary)]";
  const textareaClass =
    "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-3.5 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] transition-all duration-200 resize-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Event Name, Organizer (and Event Type only in full flow) */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="eventName" className={labelClass}>
            Event Name <span className="text-[var(--primary)]">*</span>
          </label>
          <input
            id="eventName"
            type="text"
            value={formData.eventName ?? ""}
            onChange={(e) => set("eventName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Club Meetup"
            required
          />
        </div>
        <div>
          <label htmlFor="organizerName" className={labelClass}>
            Organizer / Club Name <span className="text-[var(--primary)]">*</span>
          </label>
          <input
            id="organizerName"
            type="text"
            value={formData.organizerName ?? ""}
            onChange={(e) => set("organizerName", e.target.value)}
            className={inputClass}
            placeholder="e.g. CS Student Society"
            required
          />
        </div>
      </div>

      {!directBooking && (
        <div className="sm:col-span-2">
          <EventTypeSelector
            id="eventType"
            label="Event Type"
            value={formData.eventType ?? ""}
            customValue={formData.eventTypeCustom ?? ""}
            onChange={(v, custom) => {
              set("eventType", v);
              if (custom !== undefined) set("eventTypeCustom", custom);
            }}
            required
          />
        </div>
      )}

      {/* 1. Preferred Date */}
      <DatePickerButton
        value={formData.preferredDate ?? ""}
        onChange={(v) => set("preferredDate", v)}
        label="Preferred Date"
        required
      />

      {/* 2. Preferred Time Slot */}
      <TimeSlotButton
        id="timeSlot"
        label="Preferred Time Slot"
        value={formData.timeSlot ?? ""}
        onChange={(v) => set("timeSlot", v)}
        required
      />

      {/* 3. Event Duration */}
      <div>
        <p className={labelClass}>
          Event Duration <span className="text-[var(--primary)]">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((opt) => {
            const isSelected = !isCustomDuration && durationMin === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setIsCustomDuration(false);
                  set("durationMinutes", opt.value);
                }}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                  isSelected
                    ? "border-2 border-[var(--primary)] bg-[var(--primary)] shadow-md"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--borderStrong)] hover:text-[var(--text)]"
                }`}
                style={isSelected ? { color: "var(--primaryText)" } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomDuration(true)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
              isCustomDuration
                ? "border-2 border-[var(--primary)] bg-[var(--primary)] shadow-md"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--borderStrong)] hover:text-[var(--text)]"
            }`}
            style={isCustomDuration ? { color: "var(--primaryText)" } : undefined}
          >
            Custom
          </button>
        </div>
        {isCustomDuration && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 transition-all duration-200">
            <p className="mb-4 text-sm text-[var(--textSecondary)]">Custom duration (30 min – 6 h)</p>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="durHours" className="mb-1 block text-xs text-[var(--textMuted)]">Hours</label>
                <select
                  id="durHours"
                  value={customHours}
                  onChange={(e) => setCustomDuration(Number(e.target.value), customMinutes)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] transition-all duration-200"
                >
                  {CUSTOM_HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="durMinutes" className="mb-1 block text-xs text-[var(--textMuted)]">Minutes</label>
                <select
                  id="durMinutes"
                  value={customMinutes}
                  onChange={(e) => setCustomDuration(customHours, Number(e.target.value))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] transition-all duration-200"
                >
                  {CUSTOM_MINUTES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-[var(--primary)] font-medium">
                Custom duration: {formatDuration(durationMin)}
              </p>
            </div>
            {!durationValid && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--danger)]/50 bg-[var(--dangerBg)] p-3">
                <svg className="h-4 w-4 shrink-0 text-[var(--danger)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs font-medium text-[var(--danger)]">
                  Duration must be between 30 min and 6 h.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Time Bar (only when booking a specific room) */}
      {directBooking && roomId && formData.preferredDate && formData.timeSlot && (
        <TimeBar
          roomId={roomId}
          date={formData.preferredDate}
          timeSlot={formData.timeSlot}
          durationMinutes={formData.durationMinutes ?? 60}
          existingBookings={existingBookings}
          onAdjustToNextAvailable={(newTimeSlot) => {
            onChange({ ...formData, timeSlot: newTimeSlot });
          }}
        />
      )}

      {/* 4. Group Size */}
      <div>
        <label htmlFor="groupSize" className={labelClass}>
          Group Size <span className="text-[var(--primary)]">*</span>
        </label>
        <input
          id="groupSize"
          type="number"
          min={1}
          value={formData.groupSize || ""}
          onChange={(e) => set("groupSize", parseInt(e.target.value, 10) || 0)}
          className={inputClass}
          placeholder="e.g. 20"
          required
        />
      </div>

      {/* AV section (full flow only) */}
      {!directBooking && (
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={formData.avNeedsEnabled ?? false}
            onChange={(e) => set("avNeedsEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-[var(--focusRing)]"
          />
          <span className="text-sm font-medium text-[var(--textSecondary)]">I need AV / equipment</span>
        </label>
        <div
          className="overflow-hidden transition-[max-height] duration-200 ease-out"
          style={{ maxHeight: formData.avNeedsEnabled ? "400px" : "0" }}
        >
          <div className="pt-3 space-y-3">
            <p className="text-sm text-[var(--textSecondary)]">What do you need?</p>
            <div className="flex flex-wrap gap-2">
              {AV_NEED_OPTIONS.map((opt) => {
                const isSelected =
                  opt.value === "none" ? avNeeds.length === 0 : avNeeds.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleAvNeed(opt.value)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                      isSelected
                        ? "border-2 border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div>
              <label htmlFor="avNotes" className="mb-1.5 block text-sm font-medium text-[var(--textSecondary)]">
                Additional AV notes <span className="text-[var(--textMuted)]">(optional)</span>
              </label>
              <textarea
                id="avNotes"
                rows={2}
                value={formData.avNotes ?? ""}
                onChange={(e) => set("avNotes", e.target.value)}
                className={textareaClass}
                placeholder="e.g., specific equipment, setup needs..."
              />
            </div>
          </div>
        </div>

        {/* Furniture Requirements (replaces accessibility) */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={formData.furnitureNeedsEnabled ?? false}
            onChange={(e) => set("furnitureNeedsEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-[var(--focusRing)]"
          />
          <span className="text-sm font-medium text-[var(--textSecondary)]">I have specific furniture needs</span>
        </label>
        <div
          className="overflow-hidden transition-[max-height] duration-200 ease-out"
          style={{ maxHeight: formData.furnitureNeedsEnabled ? "420px" : "0" }}
        >
          <div className="pt-3 space-y-3">
            <p className="text-sm text-[var(--textSecondary)]">Select one option (rooms must match)</p>
            <div className="flex flex-wrap gap-2">
              {furnitureOptions.map((label) => {
                const isSelected = furnitureNeeds.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFurnitureNeed(label)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                      isSelected
                        ? "border-2 border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--textSecondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      {!directBooking && (
      <div className="grid gap-6 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
        <BuildingButton
          value={formData.preferredBuilding ?? ""}
          onChange={(v) => set("preferredBuilding", v)}
          buildings={buildings}
          label="Preferred Building"
        />
        <div>
          <label htmlFor="priorityLevel" className={labelClass}>
            Priority Level <span className="text-[var(--textMuted)]">(optional)</span>
          </label>
          <select
            id="priorityLevel"
            value={formData.priorityLevel ?? "Medium"}
            onChange={(e) => set("priorityLevel", e.target.value)}
            className={inputClass}
          >
            {PRIORITY_LEVELS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={!isValid}
          className="w-full rounded-xl bg-[var(--primary)] px-6 py-4 text-lg font-semibold shadow-md transition-all duration-150 hover:bg-[var(--primaryHover)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--primary)] sm:w-auto sm:min-w-[220px]"
          style={{ 
            color: "var(--primaryText)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" 
          }}
        >
          {directBooking ? "Confirm Booking" : "Find Available Rooms"}
        </button>
      </div>
    </form>
  );
}
