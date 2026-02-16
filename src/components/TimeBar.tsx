"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TIME_SLOTS_30MIN, timeToMinutes, timeRangesOverlap, formatTimeSlot } from "@/types/booking";

interface TimeBarProps {
  roomId: string | number;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  existingBookings: { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number }[];
  onAdjustToNextAvailable?: (timeSlot: string) => void;
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

export function TimeBar({
  roomId,
  date,
  timeSlot,
  durationMinutes,
  existingBookings,
  onAdjustToNextAvailable,
}: TimeBarProps) {
  const { selectedRange, bookedRanges, nextAvailableBlock, hasConflict } = useMemo(() => {
    if (!date || !timeSlot || !durationMinutes) {
      return { selectedRange: null, bookedRanges: [], nextAvailableBlock: null, hasConflict: false };
    }

    const selectedStart = timeToMinutes(timeSlot);
    const selectedEnd = selectedStart + durationMinutes;
    const selectedRange = { start: selectedStart, end: selectedEnd };

    const roomBookings = existingBookings.filter(
      (b) => String(b.roomId) === String(roomId) && b.preferredDate === date
    );

    // Get all booked ranges
    const bookedRanges = roomBookings.map((b) => {
      const start = timeToMinutes(b.timeSlot);
      const end = start + (b.durationMinutes ?? 60);
      return { start, end };
    });

    // Check if selected range conflicts
    const hasConflict = bookedRanges.some((booked) =>
      timeRangesOverlap(booked.start, booked.end - booked.start, selectedStart, durationMinutes)
    );

    // Find next available block
    let nextAvailableBlock: { start: number; end: number; slot: string } | null = null;
    if (hasConflict) {
      const sortedBookings = [...roomBookings].sort((a, b) => {
        return timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot);
      });

      const conflictEnd = Math.max(
        ...bookedRanges
          .filter((booked) =>
            timeRangesOverlap(booked.start, booked.end - booked.start, selectedStart, durationMinutes)
          )
          .map((b) => b.end),
        selectedStart
      );

      for (const slot of TIME_SLOTS_30MIN) {
        const slotStartM = timeToMinutes(slot.value);
        if (slotStartM < conflictEnd) continue;
        if (slotStartM + durationMinutes > DAY_END) break;

        const conflictsWithBlock = sortedBookings.some((b) => {
          const bStart = timeToMinutes(b.timeSlot);
          const bDuration = b.durationMinutes ?? 60;
          return timeRangesOverlap(bStart, bDuration, slotStartM, durationMinutes);
        });

        if (!conflictsWithBlock) {
          nextAvailableBlock = {
            start: slotStartM,
            end: slotStartM + durationMinutes,
            slot: slot.value,
          };
          break;
        }
      }
    }

    return { selectedRange, bookedRanges, nextAvailableBlock, hasConflict };
  }, [roomId, date, timeSlot, durationMinutes, existingBookings]);

  if (!selectedRange) {
    return null;
  }

  // Create 30-minute segments
  const segments = TIME_SLOTS_30MIN.map((slot) => {
    const start = timeToMinutes(slot.value);
    const end = start + 30;
    return { start, end, label: slot.label };
  });

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
            const state = getSegmentState(seg.start, seg.end);
            const heat = getSegmentHeat(seg.start, seg.end);
            const left = ((seg.start - DAY_START) / TOTAL_MINUTES) * 100;
            const width = (30 / TOTAL_MINUTES) * 100;
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
                className={`absolute top-0 bottom-0 border-r border-[var(--border)]/30 ${getSegmentStyle(state, heat)}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`${seg.label} - ${state === "booked" ? "Booked" : state === "selected" ? "Selected" : "Available"}`}
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
                  ? "bg-[var(--danger)]/30 border-2 border-[var(--danger)]"
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

      {/* Conflict tooltip / Next available action */}
      {hasConflict && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-[var(--danger)]">
            <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>
              Conflicts with existing booking{bookedRanges.length > 1 ? "s" : ""}
            </span>
          </div>
          {nextAvailableBlock && onAdjustToNextAvailable && (
            <button
              type="button"
              onClick={() => onAdjustToNextAvailable(nextAvailableBlock!.slot)}
              className="w-full rounded-lg border border-[var(--primary)]/50 bg-transparent px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary)]/10 transition-colors"
              style={{ color: "var(--primary)" }}
            >
              Adjust to {formatTimeLabel(nextAvailableBlock.start)}–{formatTimeLabel(nextAvailableBlock.end)}
            </button>
          )}
          {!nextAvailableBlock && (
            <p className="text-xs text-[var(--textMuted)]">No availability remaining for this date.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
