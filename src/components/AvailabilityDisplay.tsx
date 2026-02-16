"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TIME_SLOTS_30MIN, timeToMinutes, timeRangesOverlap, formatTimeSlot, formatDuration } from "@/types/booking";

interface AvailabilityDisplayProps {
  roomId: string | number;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  existingBookings: { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number }[];
  onAdjustToNextAvailable?: (timeSlot: string) => void;
}

function formatTimeRange(startM: number, endM: number): string {
  const startH = Math.floor(startM / 60);
  const startMin = startM % 60;
  const startPeriod = startH >= 12 ? "PM" : "AM";
  const startH12 = startH > 12 ? startH - 12 : startH === 0 ? 12 : startH;
  const endH = Math.floor(endM / 60);
  const endMin = endM % 60;
  const endPeriod = endH >= 12 ? "PM" : "AM";
  const endH12 = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
  return `${startH12}:${String(startMin).padStart(2, "0")} ${startPeriod} – ${endH12}:${String(endMin).padStart(2, "0")} ${endPeriod}`;
}

export function AvailabilityDisplay({
  roomId,
  date,
  timeSlot,
  durationMinutes,
  existingBookings,
  onAdjustToNextAvailable,
}: AvailabilityDisplayProps) {
  const availability = useMemo(() => {
    if (!date || !timeSlot || !durationMinutes) {
      return null;
    }

    const startM = timeToMinutes(timeSlot);
    const endM = startM + durationMinutes;
    const roomBookings = existingBookings.filter(
      (b) => String(b.roomId) === String(roomId) && b.preferredDate === date
    );

    // Check if current selection conflicts
    const conflictingBookings = roomBookings.filter((b) => {
      const existingStart = timeToMinutes(b.timeSlot);
      const existingDuration = b.durationMinutes ?? 60;
      return timeRangesOverlap(existingStart, existingDuration, startM, durationMinutes);
    });

    const hasConflict = conflictingBookings.length > 0;

    // Find next available continuous block
    let nextAvailableBlock: { start: number; end: number; slot: string } | null = null;
    
    if (hasConflict) {
      // Sort bookings by start time
      const sortedBookings = [...roomBookings].sort((a, b) => {
        return timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot);
      });

      const DAY_START = 9 * 60; // 9:00 AM
      const DAY_END = 22 * 60; // 10:00 PM

      // Find the end of the latest conflicting booking
      const conflictEnd = Math.max(
        ...conflictingBookings.map((b) => {
          const bStart = timeToMinutes(b.timeSlot);
          return bStart + (b.durationMinutes ?? 60);
        }),
        startM // Start from current selection if no conflicts found
      );

      // Try to find next available block starting from conflict end
      // Check all 30-min slots from conflict end to day end
      for (const slot of TIME_SLOTS_30MIN) {
        const slotStartM = timeToMinutes(slot.value);
        
        // Only consider slots after the conflict ends
        if (slotStartM < conflictEnd) continue;
        
        // Check if this slot + duration fits before day end
        if (slotStartM + durationMinutes > DAY_END) break;
        
        // Check if this block conflicts with any booking
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

    // Get conflict details
    const conflictDetails = conflictingBookings.map((b) => {
      const bStart = timeToMinutes(b.timeSlot);
      const bEnd = bStart + (b.durationMinutes ?? 60);
      return {
        start: bStart,
        end: bEnd,
        timeRange: formatTimeRange(bStart, bEnd),
      };
    });

    return {
      hasConflict,
      conflictDetails,
      nextAvailableBlock,
      timeRange: formatTimeRange(startM, endM),
    };
  }, [roomId, date, timeSlot, durationMinutes, existingBookings]);

  if (!availability) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{ borderRadius: "var(--radiusLg)" }}
    >
      {availability.hasConflict ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <svg
              className="h-5 w-5 shrink-0 text-[var(--danger)] mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--danger)] mb-1">
                Time Conflict
              </p>
              {availability.conflictDetails.length > 0 && (
                <p className="text-sm text-[var(--textSecondary)]">
                  This room is booked from {availability.conflictDetails[0].timeRange}
                  {availability.conflictDetails.length > 1 && ` and ${availability.conflictDetails.length - 1} other time${availability.conflictDetails.length > 2 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>

          {availability.nextAvailableBlock ? (
            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <p className="text-xs font-medium text-[var(--textMuted)]">
                Next available block:
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success)]/10 border border-[var(--success)]/30 px-2.5 py-1.5 text-sm font-medium text-[var(--success)]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {formatTimeRange(availability.nextAvailableBlock.start, availability.nextAvailableBlock.end)}
                </span>
                {onAdjustToNextAvailable && (
                  <button
                    type="button"
                    onClick={() => onAdjustToNextAvailable(availability.nextAvailableBlock!.slot)}
                    className="rounded-lg border border-[var(--primary)]/50 bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    Adjust to this time
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--textMuted)]">
                No availability remaining for this date.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <svg
            className="h-5 w-5 shrink-0 text-[var(--success)] mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--success)] mb-1">
              Available
            </p>
            <p className="text-sm text-[var(--textSecondary)]">
              Available from {availability.timeRange}
            </p>
            <p className="mt-0.5 text-xs text-[var(--textMuted)]">
              No conflicts detected
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
