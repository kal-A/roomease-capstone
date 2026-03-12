"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TIME_SLOTS_30MIN, timeToMinutes, timeRangesOverlap, formatTimeSlot } from "@/types/booking";

export interface TimeBarBooking {
  roomId: string;
  preferredDate: string;
  timeSlot: string;
  durationMinutes: number;
  organizerName?: string;
  organizerEmail?: string;
}

interface TimeBarProps {
  roomId: string | number;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  existingBookings: TimeBarBooking[];
  onAdjustToNextAvailable?: (timeSlot: string) => void;
  onSelectSlot?: (timeSlot: string) => void;
  /** For privacy: show "FirstName · xxx@uwaterloo.ca" unless viewer is organizer/admin */
  viewerEmail?: string | null;
}

const DAY_START = 9 * 60; // 9:00 AM
const DAY_END = 22 * 60; // 10:00 PM
const TOTAL_MINUTES = DAY_END - DAY_START;

function formatTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function minutesToSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function truncateEmailForDisplay(email: string | undefined, isViewer: boolean): string {
  if (!email) return "—";
  if (isViewer) return email;
  const [local] = email.split("@");
  if (!local || local.length <= 3) return "***@***";
  return `${local.slice(0, 3)}***@${email.includes("@") ? email.split("@")[1] : "uwaterloo.ca"}`;
}

function getFirstName(name: string | undefined): string {
  if (!name || !name.trim()) return "—";
  return name.trim().split(/\s+/)[0] ?? "—";
}

export function TimeBar({
  roomId,
  date,
  timeSlot,
  durationMinutes,
  existingBookings,
  onAdjustToNextAvailable,
  onSelectSlot,
  viewerEmail,
}: TimeBarProps) {
  const { selectedRange, bookedRanges, roomBookings, nextAvailableBlock, alternativeSlots, hasConflict } = useMemo(() => {
    if (!date || !timeSlot || !durationMinutes) {
      return { selectedRange: null, bookedRanges: [], roomBookings: [], nextAvailableBlock: null, alternativeSlots: [], hasConflict: false };
    }

    const selectedStart = timeToMinutes(timeSlot);
    const selectedEnd = selectedStart + durationMinutes;
    const selectedRange = { start: selectedStart, end: selectedEnd };

    const roomBookings = existingBookings.filter(
      (b) => String(b.roomId) === String(roomId) && b.preferredDate === date
    );

    const bookedRanges = roomBookings.map((b) => {
      const start = timeToMinutes(b.timeSlot);
      const end = start + (b.durationMinutes ?? 60);
      return { start, end };
    });

    const hasConflict = bookedRanges.some((booked) =>
      timeRangesOverlap(booked.start, booked.end - booked.start, selectedStart, durationMinutes)
    );

    let nextAvailableBlock: { start: number; end: number; slot: string } | null = null;
    const alternativeSlots: { start: number; end: number; slot: string; label?: string }[] = [];
    if (hasConflict) {
      const sortedBookings = [...roomBookings].sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot));
      for (const slot of TIME_SLOTS_30MIN) {
        const slotStartM = timeToMinutes(slot.value);
        if (slotStartM + durationMinutes > DAY_END) break;
        const conflictsWithBlock = sortedBookings.some((b) => {
          const bStart = timeToMinutes(b.timeSlot);
          const bDuration = b.durationMinutes ?? 60;
          return timeRangesOverlap(bStart, bDuration, slotStartM, durationMinutes);
        });
        if (!conflictsWithBlock) {
          const block = { start: slotStartM, end: slotStartM + durationMinutes, slot: slot.value };
          if (!nextAvailableBlock) nextAvailableBlock = block;
          if (alternativeSlots.length < 3) alternativeSlots.push(block);
        }
      }
    }

    return { selectedRange, bookedRanges, roomBookings, nextAvailableBlock, alternativeSlots, hasConflict };
  }, [roomId, date, timeSlot, durationMinutes, existingBookings]);

  if (!selectedRange) {
    return null;
  }

  const getSegmentState = (segStart: number, segEnd: number): "available" | "booked" | "selected" | "out-of-range" => {
    if (segStart < DAY_START || segEnd > DAY_END) return "out-of-range";
    const isBooked = bookedRanges.some((booked) =>
      timeRangesOverlap(booked.start, booked.end - booked.start, segStart, segEnd - segStart)
    );
    const isSelected = selectedRange && timeRangesOverlap(selectedRange.start, durationMinutes, segStart, segEnd - segStart);
    if (isSelected) return "selected";
    if (isBooked) return "booked";
    return "available";
  };

  // Create 30-minute segments for bar and for block list
  const segments = useMemo(() => {
    return TIME_SLOTS_30MIN.map((slot) => {
      const start = timeToMinutes(slot.value);
      const end = start + 30;
      const state = getSegmentState(start, end);
      return { start, end, label: slot.label, value: slot.value, state };
    });
  }, [bookedRanges, selectedRange, durationMinutes]);

  // Calculate availability heat (how many bookings overlap with this segment)
  const getSegmentHeat = (segStart: number, segEnd: number): number => {
    const overlappingBookings = bookedRanges.filter((booked) =>
      timeRangesOverlap(booked.start, booked.end - booked.start, segStart, segEnd - segStart)
    );
    return overlappingBookings.length;
  };

  const getSegmentStyle = (state: string, heat: number = 0) => {
    switch (state) {
      case "selected":
        return hasConflict
          ? "bg-[var(--danger)]/20 border-[var(--danger)]/60"
          : "bg-[var(--primary)]/15 border-[var(--primary)]/50 shadow-[0_0_0_1px_var(--primary)]/30";
      case "booked":
        return "bg-[var(--danger)]/10 border-[var(--danger)]/30";
      case "out-of-range":
        return "bg-[var(--border)]/30 border-[var(--border)]/20";
      default:
        // Heat zones: more availability = greener, less = more muted
        if (heat === 0) return "bg-[var(--success)]/12 border-[var(--success)]/25";
        if (heat === 1) return "bg-[var(--success)]/8 border-[var(--success)]/20";
        return "bg-[var(--border)]/40 border-[var(--border)]/30";
    }
  };

  const selectedLeft = ((selectedRange.start - DAY_START) / TOTAL_MINUTES) * 100;
  const selectedWidth = (durationMinutes / TOTAL_MINUTES) * 100;
  const nextAvailableLeft = nextAvailableBlock ? ((nextAvailableBlock.start - DAY_START) / TOTAL_MINUTES) * 100 : null;
  const nextAvailableWidth = nextAvailableBlock ? ((nextAvailableBlock.end - nextAvailableBlock.start) / TOTAL_MINUTES) * 100 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{ borderRadius: "var(--radiusLg)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text)]">Availability</p>
        {!hasConflict && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-[var(--success)] font-medium"
          >
            ✓ Available for selected duration
          </motion.p>
        )}
      </div>

      {/* Time Bar */}
      <div className="relative mb-2">
        <div className="relative h-10 w-full rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surfaceElevated)]">
          {/* Segments */}
          {segments.map((seg, idx) => {
            const heat = getSegmentHeat(seg.start, seg.end);
            const left = ((seg.start - DAY_START) / TOTAL_MINUTES) * 100;
            const width = (30 / TOTAL_MINUTES) * 100;
            const isAvailable = seg.state === "available";
            const canSelect = isAvailable && onSelectSlot && durationMinutes <= 30;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
                className={`absolute top-0 bottom-0 border-r border-[var(--border)]/30 ${getSegmentStyle(seg.state, heat)} ${canSelect ? "cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/50 hover:ring-inset" : ""}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  ...(isAvailable ? { animation: "pulse-soft 2s ease-in-out infinite" } : {}),
                }}
                title={canSelect ? `Select ${seg.label}` : `${seg.label} - ${seg.state === "booked" ? "Booked" : seg.state === "selected" ? "Selected" : "Available"}`}
                onClick={canSelect ? () => onSelectSlot?.(seg.value) : undefined}
                role={canSelect ? "button" : undefined}
              />
            );
          })}

          {/* Selected range overlay (if conflict, shows red) */}
          {selectedRange && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ 
                opacity: 1, 
                scaleX: 1,
                ...(hasConflict ? {
                  x: [0, -2, 2, -2, 2, 0],
                } : {}),
              }}
              transition={{ 
                duration: 0.3,
                ...(hasConflict ? {
                  x: { duration: 0.4, ease: "easeInOut" },
                } : {}),
              }}
              className={`absolute top-0 bottom-0 rounded ${
                hasConflict
                  ? "bg-[var(--danger)]/30 border-2 border-[var(--danger)] ring-2 ring-[var(--danger)]/40"
                  : "bg-[var(--primary)]/20 border-2 border-[var(--primary)]"
              }`}
              style={{
                left: `${selectedLeft}%`,
                width: `${selectedWidth}%`,
                transformOrigin: "left",
                ...(hasConflict ? {} : {
                  boxShadow: "0 0 0 2px var(--primaryGlow)",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }),
              }}
            />
          )}
          
          {/* Time label above selected range */}
          {selectedRange && !hasConflict && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--primary)]/10 border border-[var(--primary)]/40 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]"
              style={{
                left: `${selectedLeft + selectedWidth / 2}%`,
              }}
            >
              {formatTimeLabel(selectedRange.start)}–{formatTimeLabel(selectedRange.end)}
            </motion.div>
          )}

          {/* Next available block indicator */}
          {nextAvailableBlock && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--primary)]/10 border border-[var(--primary)]/40 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]"
                style={{
                  left: `${(nextAvailableLeft ?? 0) + (nextAvailableWidth ?? 0) / 2}%`,
                }}
              >
                Next: {formatTimeLabel(nextAvailableBlock.start)}–{formatTimeLabel(nextAvailableBlock.end)}
              </motion.div>
              <div
                className="absolute top-0 bottom-0 border-2 border-[var(--primary)]/60 border-dashed rounded"
                style={{
                  left: `${nextAvailableLeft}%`,
                  width: `${nextAvailableWidth}%`,
                }}
              />
            </>
          )}
        </div>

        {/* Time labels */}
        <div className="mt-1 flex justify-between text-[10px] text-[var(--textMuted)]">
          <span>9:00 AM</span>
          <span>10:00 PM</span>
        </div>
      </div>

      {/* Block list: 1hr blocks e.g. 2pm–3pm █ Booked / Available */}
      <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
        {segments.filter((_, i) => i % 2 === 0).map((seg, idx) => {
          const seg2 = segments[idx * 2 + 1];
          const startLabel = seg.label;
          const endLabel = seg2 ? formatTimeLabel(seg2.end) : formatTimeLabel(seg.end + 30);
          const label = `${startLabel}–${endLabel}`;
          const anyBooked = seg.state === "booked" || (seg2?.state === "booked");
          const anySelected = seg.state === "selected" || (seg2?.state === "selected");
          const allAvailable = seg.state === "available" && (!seg2 || seg2.state === "available");
          const barClass = anyBooked
            ? "bg-[var(--danger)]/40"
            : anySelected
              ? "bg-[var(--primary)]/50"
              : "bg-[var(--success)]/30";
          const status = anyBooked ? "Booked" : anySelected ? "Selected" : "Available";
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 text-xs"
            >
              <span className="w-28 shrink-0 text-[var(--textSecondary)]">{label}</span>
              <div className="flex-1 h-5 rounded overflow-hidden bg-[var(--border)]/30">
                <div
                  className={`h-full w-full rounded ${barClass}`}
                  style={allAvailable ? { animation: "pulse-soft 2s ease-in-out infinite" } : undefined}
                />
              </div>
              <span className={`w-16 shrink-0 text-right ${anyBooked ? "text-[var(--danger)]" : anySelected ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                {status}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Conflict: clear state, next available, Shift +30m, Next slot, privacy-aware booked list */}
      {hasConflict && (
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--danger)]/50 bg-[var(--dangerBg)]/30 p-4">
          <div className="flex items-start gap-2 text-xs text-[var(--danger)] font-medium">
            <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>
              Your requested time: {formatTimeLabel(selectedRange.start)}–{formatTimeLabel(selectedRange.end)} is unavailable
            </span>
          </div>
          {/* Overlapping bookings (privacy: organizer first name + truncated email unless viewer is organizer) */}
          {roomBookings.some((b) => {
            const start = timeToMinutes(b.timeSlot);
            const dur = b.durationMinutes ?? 60;
            return timeRangesOverlap(start, dur, selectedRange.start, durationMinutes);
          }) && (
            <div className="space-y-1">
              {roomBookings
                .filter((b) => {
                  const start = timeToMinutes(b.timeSlot);
                  const dur = b.durationMinutes ?? 60;
                  return timeRangesOverlap(start, dur, selectedRange.start, durationMinutes);
                })
                .map((b, i) => {
                  const isViewer = !!viewerEmail && b.organizerEmail === viewerEmail;
                  const displayName = getFirstName(b.organizerName);
                  const displayEmail = truncateEmailForDisplay(b.organizerEmail, isViewer);
                  return (
                    <p key={i} className="text-xs text-[var(--textSecondary)]">
                      Booked · Organizer: {displayName} · {displayEmail}
                    </p>
                  );
                })}
            </div>
          )}
          {nextAvailableBlock && (
            <p className="text-xs text-[var(--textSecondary)]">
              Next available start time: {formatTimeLabel(nextAvailableBlock.start)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {/* Shift +30m: move start by 30 minutes, clamp to day */}
            {(() => {
              const shiftStart = selectedRange.start + 30;
              const clampedStart = Math.min(shiftStart, DAY_END - durationMinutes);
              const shiftSlot = minutesToSlot(clampedStart);
              const wouldConflict = roomBookings.some((b) => {
                const start = timeToMinutes(b.timeSlot);
                const dur = b.durationMinutes ?? 60;
                return timeRangesOverlap(start, dur, clampedStart, durationMinutes);
              });
              if (clampedStart < DAY_START || wouldConflict) return null;
              return (
                <button
                  type="button"
                  onClick={() => onAdjustToNextAvailable?.(shiftSlot)}
                  className="rounded-lg border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                >
                  Shift +30m
                </button>
              );
            })()}
            {nextAvailableBlock && (
              <button
                type="button"
                onClick={() => onAdjustToNextAvailable?.(nextAvailableBlock!.slot)}
                className="rounded-lg border border-[var(--primary)]/50 bg-[var(--primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/25 transition-colors"
              >
                Next available slot
              </button>
            )}
            {alternativeSlots.slice(0, 2).map((alt) => (
              <button
                key={alt.slot}
                type="button"
                onClick={() => onAdjustToNextAvailable?.(alt.slot)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)] hover:text-[var(--text)] transition-colors"
              >
                {formatTimeLabel(alt.start)}–{formatTimeLabel(alt.end)}
              </button>
            ))}
          </div>
          {alternativeSlots.length === 0 && !nextAvailableBlock && (
            <p className="text-xs text-[var(--textMuted)]">No availability remaining for this date. Try another day.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
