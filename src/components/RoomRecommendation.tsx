"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { EventFormData } from "@/types/booking";
import type { Room } from "@/types/booking";
import { RoomCard } from "./RoomCard";
import { RoomDetailsModal } from "./RoomDetailsModal";

interface RoomRecommendationProps {
  formData: EventFormData;
  matchingRooms: Room[];
  onSelectRoom: (room: Room) => void;
  onBack: () => void;
  doubleBookingError: string | null;
}

export function RoomRecommendation({
  formData,
  matchingRooms,
  onSelectRoom,
  onBack,
  doubleBookingError,
}: RoomRecommendationProps) {
  const [detailsRoom, setDetailsRoom] = useState<Room | null>(null);

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
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--danger)]/50 bg-[var(--dangerBg)] p-4"
          style={{ borderRadius: "var(--radiusLg)" }}
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <svg className="h-5 w-5 shrink-0 text-[var(--danger)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-[var(--danger)] leading-relaxed">{doubleBookingError}</p>
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
