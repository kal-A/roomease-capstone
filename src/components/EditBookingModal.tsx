"use client";

import { useCallback, useEffect, useState } from "react";
import type { Booking, BookingStatus } from "@/lib/bookingsStore";
import { useBookings } from "@/lib/bookingsStore";
import { timeRangesOverlap, timeToMinutes } from "@/types/booking";
import { DURATION_PRESETS, TIME_SLOTS_30MIN } from "@/types/booking";
import { buildBookingRange } from "@/lib/bookingTime";

interface EditBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => Promise<void> | void;
  onDeleteSuccess?: () => Promise<void> | void;
}

export function EditBookingModal({ booking, isOpen, onClose, onSaveSuccess, onDeleteSuccess }: EditBookingModalProps) {
  const { bookings, updateBooking, cancelBooking, setBookingStatus } = useBookings();
  const [eventName, setEventName] = useState(booking.eventName);
  const [organizerName, setOrganizerName] = useState(booking.organizerName);
  const [preferredDate, setPreferredDate] = useState(booking.preferredDate);
  const [timeSlot, setTimeSlot] = useState(booking.timeSlot);
  const [durationMinutes, setDurationMinutes] = useState(booking.durationMinutes);
  const [groupSize, setGroupSize] = useState(booking.groupSize);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEventName(booking.eventName);
      setOrganizerName(booking.organizerName);
      setPreferredDate(booking.preferredDate);
      setTimeSlot(booking.timeSlot);
      setDurationMinutes(booking.durationMinutes);
      setGroupSize(booking.groupSize);
      setConflictError(null);
      setSaveError(null);
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isSaving) return;
      setConflictError(null);
      setSaveError(null);

      (async () => {
        setIsSaving(true);
        try {
          const blockedStatuses = ["pending", "approved", "confirmed", "changes_requested"];
          const others = bookings.filter((b) => b.id !== booking.id && blockedStatuses.includes(b.status));

          const startM = timeToMinutes(timeSlot);
          const overlap = others.some((b) => {
            if (b.roomId !== booking.roomId || b.preferredDate !== preferredDate) return false;
            const existingStart = timeToMinutes(b.timeSlot);
            const existingDuration = b.durationMinutes ?? 60;
            return timeRangesOverlap(existingStart, existingDuration, startM, durationMinutes);
          });

          if (overlap) {
            setConflictError("This room is already booked for that time.");
            return;
          }

          if (!booking.backendId) {
            setSaveError("This booking cannot be edited (missing backend id).");
            return;
          }

          const { startTimeIsoUtc, endTimeIsoUtc } = buildBookingRange({
            preferredDate,
            timeSlot,
            durationMinutes,
          });

          const res = await fetch(`/api/bookings/${booking.backendId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: booking.roomId,
              eventName,
              organizerName,
              groupSize: Number(groupSize),
              startTime: startTimeIsoUtc,
              endTime: endTimeIsoUtc,
            }),
          });

          if (!res.ok) {
            const json = (await res.json().catch(() => ({}))) as { error?: unknown };
            const msg = typeof json.error === "string" ? json.error : "Update failed.";
            if (res.status === 400) setConflictError(msg);
            else setSaveError(msg);
            return;
          }

          const json = (await res.json().catch(() => ({}))) as { booking?: { status?: string } };

          updateBooking(booking.id, {
            eventName,
            organizerName,
            preferredDate,
            timeSlot,
            durationMinutes,
            groupSize,
          });

          const updatedStatusRaw = String(json?.booking?.status ?? booking.status).toLowerCase().trim();
          const allowed: BookingStatus[] = ["pending", "approved", "denied", "confirmed", "changes_requested"];
          const updatedStatus: BookingStatus = allowed.includes(updatedStatusRaw as BookingStatus)
            ? (updatedStatusRaw as BookingStatus)
            : booking.status;
          setBookingStatus(booking.id, updatedStatus);

          await onSaveSuccess?.();
          onClose();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not update booking.";
          setSaveError(msg);
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [
      booking,
      bookings,
      isSaving,
      durationMinutes,
      eventName,
      groupSize,
      onClose,
      onSaveSuccess,
      organizerName,
      preferredDate,
      timeSlot,
      updateBooking,
      setBookingStatus,
    ]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-booking-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 id="edit-booking-title" className="text-lg font-semibold text-[var(--text)]">
            Edit booking
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                if (window.confirm("Delete this booking?")) {
                  (async () => {
                    setIsDeleting(true);
                    if (booking.backendId) {
                      try {
                        const res = await fetch(`/api/bookings/${booking.backendId}`, { method: "DELETE" });
                        if (!res.ok) {
                          const json = (await res.json().catch(() => ({}))) as { error?: unknown };
                          const msg = typeof json.error === "string" ? json.error : "Delete failed.";
                          setSaveError(msg);
                          return;
                        }

                        await onDeleteSuccess?.();
                        onClose();
                      } finally {
                        setIsDeleting(false);
                      }
                    } else {
                      // Demo fallback: no backend id means we only have local state.
                      cancelBooking(booking.id);
                      setIsDeleting(false);
                      onClose();
                    }
                  })();
                }
              }}
              className="rounded-lg p-2 text-[var(--textSecondary)] transition hover:bg-[var(--danger)]/20 hover:text-[var(--danger)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50"
              aria-label="Delete booking"
              title="Delete booking"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--textSecondary)] transition hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-[var(--textMuted)]">Confirmation #{booking.confirmationNumber} (unchanged)</p>
          <p className="text-sm text-[var(--textMuted)]">Room: {booking.roomName}</p>

          {conflictError && (
            <div className="rounded-xl border-2 border-[#FFD100]/60 bg-[#FFD100]/10 p-3" role="alert">
              <p className="text-sm font-semibold text-[#FFD100]">{conflictError}</p>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border-2 border-[var(--dangerBorder)] bg-[var(--dangerBg)] p-3" role="alert">
              <p className="text-sm font-semibold text-[var(--danger)]">{saveError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Event name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Organizer</label>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Start time</label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
            >
              {TIME_SLOTS_30MIN.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Duration</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
            >
              {DURATION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--textSecondary)] mb-1">Group size</label>
            <input
              type="number"
              min={1}
              value={groupSize || ""}
              onChange={(e) => setGroupSize(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder-[var(--textMuted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focusRing)]"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 rounded-xl bg-[#FFD100] py-3 font-semibold text-black shadow-lg transition hover:bg-[#e6bc00] focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-2 focus:ring-offset-[#1A1A1A] ${
                isSaving ? "cursor-not-allowed opacity-70" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 font-medium text-[var(--textSecondary)] hover:border-[var(--borderStrong)] hover:text-[var(--text)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
