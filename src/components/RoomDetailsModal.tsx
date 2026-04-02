"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getRoomDetailEntries } from "@/data/rooms";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { AVAndFurnitureSections } from "@/components/AVAndFurnitureSections";
import { DatePickerButton } from "@/components/DatePickerButton";
import { RoomQualityBadges } from "@/components/RoomQualityBadges";
import { RoomRating } from "@/components/RoomRating";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import { useBookings } from "@/lib/bookingsStore";
import type { Room } from "@/types/booking";
import { timeToMinutes, formatTimeSlot, formatDuration, timeRangesOverlap, TIME_SLOTS_30MIN } from "@/types/booking";

interface RoomDetailsModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  /** When true, show "Start booking with this room" linking to /book?building=... */
  showStartBooking?: boolean;
  /** When showStartBooking is false, used for "Book this room" */
  onSelectRoom?: () => void;
  selectRoomButtonLabel?: string;
  showRating?: boolean;
}

export function RoomDetailsModal({
  room,
  isOpen,
  onClose,
  showStartBooking,
  onSelectRoom,
  selectRoomButtonLabel = "Book this room",
  showRating = true,
}: RoomDetailsModalProps) {
  const { bookings } = useBookings();
  const [availabilityDate, setAvailabilityDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const details = getRoomDetailEntries(room);
  const availabilityBookings = useMemo(() => {
    return bookings.filter(
      (b) => String(b.roomId) === String(room.id) && b.preferredDate === availabilityDate
    );
  }, [bookings, room.id, availabilityDate]);

  const slotAvailability = useMemo(() => {
    return TIME_SLOTS_30MIN.map((slot) => {
      const startM = timeToMinutes(slot.value);
      const overlaps = availabilityBookings.some((b) => {
        const bStart = timeToMinutes(b.timeSlot);
        const bDur = b.durationMinutes ?? 60;
        return timeRangesOverlap(bStart, bDur, startM, 30);
      });
      return { ...slot, available: !overlaps };
    });
  }, [availabilityBookings]);

  const timelineStart = 9 * 60;
  const timelineEnd = 22 * 60;
  const timelineTotal = timelineEnd - timelineStart;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-details-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 id="room-details-title" className="text-lg font-semibold tracking-tight text-[var(--text)]">
            {room.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--textSecondary)] transition-all duration-200 hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="text-sm text-[var(--textSecondary)]">Building</p>
            <p className="text-[var(--text)] font-medium mt-1">
              {getBuildingTicketLabel(room.building)}
            </p>
          </div>
          {room.roomNumber && (
            <div>
              <p className="text-sm text-[var(--textSecondary)]">Room number</p>
              <p className="text-[var(--text)] font-medium mt-1">{room.roomNumber}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-[var(--textSecondary)]">Capacity</p>
            <p className="text-[var(--text)] font-medium mt-1">{room.capacity}</p>
          </div>

          <div className="space-y-3">
            <AVAndFurnitureSections room={room} animatedBadges={false} />
          </div>

          {showRating && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Rating</h3>
              <RoomRating roomId={room.id} showRateForm />
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Room ownership</h3>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between gap-2">
                <span className="text-[var(--textSecondary)]">Room owner</span>
                <span className="text-[var(--text)]">{getRoomMetadataWithDefaults(room.id).roomOwnerDepartment}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--textSecondary)]">Admin</span>
                <a href={`mailto:${getRoomMetadataWithDefaults(room.id).adminContact}`} className="text-[var(--primary)] hover:underline truncate max-w-[180px]">
                  {getRoomMetadataWithDefaults(room.id).adminContact}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Quality</h3>
            <RoomQualityBadges roomId={room.id} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Availability</h3>
            <button
              type="button"
              onClick={() => setShowAvailabilityModal(true)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--primary)] transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--surfaceElevated)]"
            >
              View availability
            </button>
            <p className="text-xs text-[var(--textMuted)] mt-2">Showing {availabilityDate} (9:00 – 22:00)</p>
            {availabilityBookings.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--textSecondary)] mt-3">
                No bookings for this room on this date.
              </p>
            ) : (
              <div className="relative h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] mt-3">
                {availabilityBookings.map((b) => {
                  const startM = timeToMinutes(b.timeSlot);
                  const endM = startM + (b.durationMinutes ?? 60);
                  const left = Math.max(0, ((startM - timelineStart) / timelineTotal) * 100);
                  const width = Math.min(
                    100 - left,
                    ((endM - startM) / timelineTotal) * 100
                  );
                  return (
                    <div
                      key={b.id}
                      className="absolute inset-y-1 rounded flex items-center justify-center overflow-hidden mx-0.5"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 6)}%`,
                        minWidth: "2rem",
                      }}
                      title={`${formatTimeSlot(b.timeSlot)} – ${formatDuration(b.durationMinutes)}`}
                    >
                      <span className="rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/50 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)] truncate max-w-full">
                        {formatTimeSlot(b.timeSlot)}–{formatDuration(b.durationMinutes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {details.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Other Details</h3>
              <ul className="space-y-2 text-sm">
                {details.map(({ key, value }) => (
                  <li key={key} className="flex justify-between gap-2">
                    <span className="text-[var(--textSecondary)]">{key}</span>
                    <span className="text-[var(--text)]">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="border-t border-[var(--border)] p-6 flex gap-3">
          {showStartBooking ? (
            <Link
              href={`/book?roomId=${encodeURIComponent(String(room.id))}`}
              className="flex-1 rounded-full bg-[var(--primary)] py-3 text-center font-semibold shadow-lg transition-all duration-200 hover:bg-[var(--primaryHover)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
            >
              Start booking with this room
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSelectRoom}
              className="flex-1 rounded-full bg-[var(--primary)] py-3 font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            >
              {selectRoomButtonLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] bg-transparent px-5 py-3 font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          >
            Close
          </button>
        </div>
      </div>

      {showAvailabilityModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="availability-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAvailabilityModal(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-divider)] pb-4 mb-4">
              <h2 id="availability-modal-title" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Availability — {room.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="rounded-full p-2 text-[var(--foreground-secondary)] hover:bg-[var(--border-divider)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DatePickerButton
              value={availabilityDate}
              onChange={setAvailabilityDate}
              label="Date"
              required={false}
            />
            <p className="text-xs text-[var(--foreground-tertiary)] mt-2 mb-2">
              {slotAvailability.filter((s) => s.available).length} of {slotAvailability.length} slots available
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-[140px] overflow-hidden">
              {slotAvailability.slice(0, 8).map(({ value, label, available }) => (
                <div
                  key={value}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-divider)] bg-[var(--surface)] px-2.5 py-1.5"
                >
                  <span className="text-xs font-medium text-[var(--foreground)] truncate">{label}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      available ? "bg-emerald-500/20 text-emerald-600" : "bg-[var(--border-divider)] text-[var(--foreground-tertiary)]"
                    }`}
                  >
                    {available ? "Free" : "Busy"}
                  </span>
                </div>
              ))}
            </div>
            {slotAvailability.length > 8 && (
              <p className="text-xs text-[var(--foreground-tertiary)] mb-3">+{slotAvailability.length - 8} more slots</p>
            )}
            <button
              type="button"
              onClick={() => setShowAvailabilityModal(false)}
              className="w-full rounded-full border border-[var(--border)] bg-transparent py-2.5 text-sm font-medium text-[var(--foreground-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
