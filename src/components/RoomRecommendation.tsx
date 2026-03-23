"use client";

import type { Ref } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { EventFormData } from "@/types/booking";
import type { Room } from "@/types/booking";
import { RoomCard } from "./RoomCard";
import { RoomDetailsModal } from "./RoomDetailsModal";

type BookingConflictContext = {
  isMine: boolean;
  organizerName: string;
  timeLabel: string;
};

interface RoomRecommendationProps {
  formData: EventFormData;
  matchingRooms: Room[];
  onSelectRoom: (room: Room) => void;
  onBack: () => void;
  doubleBookingError: string | null;
  bookingErrorRef?: Ref<HTMLDivElement | null>;
  errorPulseKey?: number;
  bookingConflictContext?: BookingConflictContext | null;
}

export function RoomRecommendation({
  formData,
  matchingRooms,
  onSelectRoom,
  onBack,
  doubleBookingError,
  bookingErrorRef,
  errorPulseKey = 0,
  bookingConflictContext,
}: RoomRecommendationProps) {
  const [detailsRoom, setDetailsRoom] = useState<Room | null>(null);
  const isTimeConflictError = doubleBookingError ? /booked|blocked|blocker/i.test(doubleBookingError) : false;
  const isRoomNotConfiguredError = doubleBookingError?.includes("not yet configured in the booking system") ?? false;

  if (matchingRooms.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[var(--primary)]/40 bg-[var(--surface)] p-8 shadow-lg" style={{ borderRadius: "var(--radiusLg)" }}>
        <p className="text-[var(--textSecondary)]">
          No rooms match your constraints. Try adjusting AV, furniture, building, or group size.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-xl border border-[var(--border)] bg-transparent px-6 py-3 font-medium text-[var(--textSecondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          Back
        </button>
      </div>
    );
  }

  const [bestMatch, ...otherRooms] = matchingRooms;

  return (
    <div className="space-y-4">
      {doubleBookingError && (
        <motion.div
          key={`booking-error-${errorPulseKey}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 0] }}
          transition={{ duration: 0.22 }}
          id="booking-error"
          tabIndex={-1}
          ref={bookingErrorRef}
          className="rounded-lg border border-[var(--danger)]/60 bg-[var(--dangerBg)] shadow-[var(--shadowLg)] p-4 scroll-mt-24"
          style={{ borderRadius: "var(--radiusLg)" }}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30">
              <svg className="h-5 w-5 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-7.2 12.49A2 2 0 0 0 4.82 19h14.36a2 2 0 0 0 1.73-2.65l-7.2-12.49a2 2 0 0 0-3.46 0z" />
              </svg>
            </div>
            <div className="flex-1">
              {isTimeConflictError ? (
                <>
                  <div className="text-sm font-bold text-[var(--text)]">Time slot unavailable</div>
                  <div className="mt-0.5 text-xs font-medium text-[var(--textSecondary)]">
                    {bookingConflictContext
                      ? String(bookingConflictContext.organizerName ?? "").toLowerCase().includes("blocked")
                        ? "This room is unavailable due to a blocker or closure."
                        : bookingConflictContext.isMine
                          ? "You already have this room booked for that time."
                          : "This room is already booked for that time."
                      : "This room is already booked for that time."}
                  </div>
                  <div className="mt-2 text-xs text-[var(--textSecondary)]">Try a different time or choose one of the options below.</div>
                  <div className="mt-2 text-[10px] font-medium text-[var(--textMuted)]">
                    {bookingConflictContext
                      ? bookingConflictContext.isMine
                        ? `Your booking · ${bookingConflictContext.timeLabel}`
                        : String(bookingConflictContext.organizerName ?? "").toLowerCase().includes("blocked")
                          ? `${bookingConflictContext.organizerName} · ${bookingConflictContext.timeLabel}`
                          : `Booked by ${bookingConflictContext.organizerName} · ${bookingConflictContext.timeLabel}`
                      : doubleBookingError}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-[var(--text)]">
                    {isRoomNotConfiguredError ? doubleBookingError : "Booking couldn’t be confirmed"}
                  </div>
                  <div className="mt-1 text-xs font-medium text-[var(--textSecondary)]">{doubleBookingError}</div>
                  <div className="mt-2 text-xs text-[var(--textSecondary)]">Review the details and try again.</div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onBack} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]">
          Back
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--gold)]">Best Match</h3>
        <RoomCard
          room={bestMatch}
          groupSize={formData.groupSize}
          avNeedsEnabled={formData.avNeedsEnabled ?? false}
          avNeeds={formData.avNeeds ?? []}
          furnitureNeedsEnabled={formData.furnitureNeedsEnabled ?? false}
          furnitureNeeds={formData.furnitureNeeds ?? []}
          onSelect={() => onSelectRoom(bestMatch)}
          onViewDetails={() => setDetailsRoom(bestMatch)}
          isBestMatch
        />
      </div>

      {otherRooms.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground-tertiary)]">Other Available Rooms</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherRooms.map((room) => (
              <RoomCard
                key={String(room.id)}
                room={room}
                groupSize={formData.groupSize}
                avNeedsEnabled={formData.avNeedsEnabled ?? false}
                avNeeds={formData.avNeeds ?? []}
                furnitureNeedsEnabled={formData.furnitureNeedsEnabled ?? false}
                furnitureNeeds={formData.furnitureNeeds ?? []}
                onSelect={() => onSelectRoom(room)}
                onViewDetails={() => setDetailsRoom(room)}
              />
            ))}
          </div>
        </div>
      )}

      {detailsRoom && (
        <RoomDetailsModal
          room={detailsRoom}
          isOpen={!!detailsRoom}
          onClose={() => setDetailsRoom(null)}
          onSelectRoom={() => {
            onSelectRoom(detailsRoom);
            setDetailsRoom(null);
          }}
        />
      )}
    </div>
  );
}
