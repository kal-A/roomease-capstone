"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/EmptyState";
import { ROOMS } from "@/data/rooms";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { useCompare } from "@/lib/compareStore";
import { useBookings } from "@/lib/bookingsStore";
import { AVAndFurnitureSections } from "@/components/AVAndFurnitureSections";
import { RoomDetailsModal } from "@/components/RoomDetailsModal";
import type { Room } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { timeToMinutes, formatTimeSlot, formatDuration } from "@/types/booking";

function getQuickNotes(room: Room): string[] {
  const notes: string[] = [];
  if (room.capacity > 150) notes.push("Large capacity");
  else if (room.capacity >= 51) notes.push("Medium capacity");
  else notes.push("Small capacity");
  if (roomIsStreamingRecordingCapable(room)) notes.push("Streaming & recording");
  if (roomHasDocumentCamera(room)) notes.push("Document camera");
  if (roomIsElectronicClassroom(room)) notes.push("Electronic classroom");
  return notes;
}

function MiniAvailability({ room, date }: { room: Room; date: string }) {
  const { bookings } = useBookings();
  const dayBookings = useMemo(
    () =>
      bookings.filter(
        (b) => String(b.roomId) === String(room.id) && b.preferredDate === date
      ),
    [bookings, room.id, date]
  );
  const start = 9 * 60;
  const total = 13 * 60;

  if (dayBookings.length === 0) {
    return (
      <p className="text-xs text-[var(--textMuted)]">No bookings on this date.</p>
    );
  }
    return (
      <div className="relative h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {dayBookings.map((b) => {
          const left = ((timeToMinutes(b.timeSlot) - start) / total) * 100;
          const w = ((b.durationMinutes ?? 60) / total) * 100;
          return (
            <div
              key={b.id}
              className="absolute top-1 bottom-1 rounded-lg bg-[var(--primary)]/30 border border-[var(--primary)]/50"
              style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(w, 100 - left)}%` }}
              title={`${formatTimeSlot(b.timeSlot)} – ${formatDuration(b.durationMinutes ?? 60)}`}
            />
          );
        })}
      </div>
    );
}

function CompareColumn({
  room,
  isHighestCapacity,
  index,
}: {
  room: Room;
  isHighestCapacity: boolean;
  index: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [availDate] = useState(() => new Date().toISOString().slice(0, 10));
  const notes = useMemo(() => getQuickNotes(room), [room]);

  return (
    <motion.div
      layout
      className="flex min-w-[280px] max-w-[320px] flex-shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surfaceElevated)] backdrop-blur-md p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{room.name}</h3>
          <p className="mt-1 text-sm text-[var(--textSecondary)]">{getBuildingTicketLabel(room.building)}</p>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-[var(--primary)]">{room.capacity}</span>
          <span className="text-xs text-[var(--textMuted)]">capacity</span>
        </div>
        <Link
          href={`/book?roomId=${encodeURIComponent(String(room.id))}`}
          className="mt-5 block w-full rounded-full bg-[var(--primary)] py-3 text-center text-sm font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
        >
          Book this room
        </Link>
      </div>

      <div className="flex-1 space-y-6 p-6">
        <section className="space-y-3">
          <AVAndFurnitureSections room={room} animatedBadges={false} compact />
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Availability</p>
          <p className="mb-1 text-[10px] text-[var(--textMuted)]">{availDate}</p>
          <MiniAvailability room={room} date={availDate} />
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Highlights</p>
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n} className="text-sm text-[var(--textSecondary)]">· {n}</li>
            ))}
          </ul>
        </section>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="w-full rounded-full border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
        >
          View full details
        </button>
      </div>

      {detailsOpen && (
        <RoomDetailsModal
          room={room}
          isOpen
          onClose={() => setDetailsOpen(false)}
          showStartBooking
        />
      )}
    </motion.div>
  );
}

export default function ComparePage() {
  const { compareIds, clearCompare } = useCompare();
  const [mobileIndex, setMobileIndex] = useState(0);

  const { bookings } = useBookings();
  const compareRooms = useMemo(() => {
    return compareIds
      .map((id) => ROOMS.find((r) => String(r.id) === id))
      .filter((r): r is Room => r != null);
  }, [compareIds]);

  const mostBookedBuildings = useMemo(() => {
    const byBuilding: Record<string, number> = {};
    for (const b of bookings) {
      const code = (b.building || "").trim();
      if (code) byBuilding[code] = (byBuilding[code] ?? 0) + 1;
    }
    return Object.entries(byBuilding)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [bookings]);

  const maxCapacity = useMemo(
    () => (compareRooms.length ? Math.max(...compareRooms.map((r) => r.capacity)) : 0),
    [compareRooms]
  );

  if (compareRooms.length < 2) {
    const isSingle = compareRooms.length === 1;
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>Compare Rooms</h1>
        <p className="mt-2 text-lg text-[var(--textSecondary)]">
          {isSingle
            ? "Add one more room to compare side-by-side."
            : "Select 2–4 rooms from the Rooms dashboard or booking flow to compare."}
        </p>
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title={isSingle ? "Add one more room" : "Compare rooms"}
          description={isSingle ? "Add another room from the Rooms page to compare side-by-side." : "Select 2–4 rooms from the Rooms dashboard or booking flow to compare features and capacity."}
          suggestion={isSingle ? "Use the 3-dot menu on a room card and choose \"Add to Compare\", then open the Compare bar below." : "Use \"Add to compare\" on room cards, then click Compare in the bar at the bottom."}
          action={
            <Link href="/rooms" className="inline-flex rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-black shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]">
              {isSingle ? "Browse rooms to add" : "Browse rooms"}
            </Link>
          }
        />

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8"
        >
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">Most booked buildings</h2>
          <p className="mt-1 text-sm text-[var(--textSecondary)]">Based on your bookings.</p>
          {mostBookedBuildings.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {mostBookedBuildings.map(({ code, count }) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-[var(--primary)]">{getBuildingTicketLabel(code)}</span>
                  <span className="text-[var(--textSecondary)]">{count} booking{count !== 1 ? "s" : ""}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--textSecondary)]">No bookings yet. Book a room to see your most used buildings here.</p>
          )}
        </motion.section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>Compare Rooms</h1>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">Side-by-side comparison of selected rooms.</p>
        </div>
        <button
          type="button"
          onClick={clearCompare}
          className="rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
        >
          Clear all
        </button>
      </div>

      {/* Mobile: segmented control */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 sm:hidden">
        {compareRooms.map((room, i) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setMobileIndex(i)}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
              mobileIndex === i
                ? "border-[var(--primary)] bg-[var(--primary)] text-black shadow-lg"
                : "border-[var(--border)] text-[var(--textSecondary)] hover:text-[var(--text)] hover:border-[var(--borderStrong)]"
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>

      {/* Desktop: horizontal scroll carousel */}
      <div className="hidden overflow-x-auto pb-8 sm:block">
        <div className="flex gap-6" style={{ minWidth: "min-content" }}>
          {compareRooms.map((room, i) => (
            <CompareColumn
              key={room.id}
              room={room}
              isHighestCapacity={room.capacity === maxCapacity && maxCapacity > 0}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Mobile: single column */}
      <div className="sm:hidden">
        {compareRooms[mobileIndex] && (
          <div className="pb-24">
            <CompareColumn
              key={compareRooms[mobileIndex].id}
              room={compareRooms[mobileIndex]}
              isHighestCapacity={compareRooms[mobileIndex].capacity === maxCapacity && maxCapacity > 0}
              index={0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
