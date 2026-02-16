"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBookings, type Booking, formatBookingTime } from "@/lib/bookingsStore";
import { EditBookingModal } from "@/components/EditBookingModal";
import { DeleteBookingModal } from "@/components/DeleteBookingModal";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { formatTimeSlot } from "@/types/booking";

type ViewMode = "list" | "calendar";

function getMonthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstWeekday = first.getDay();
  const daysInMonth = last.getDate();
  const pad = firstWeekday;
  const total = pad + daysInMonth;
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function DayBookingsModal({
  dateLabel,
  dateStr: targetDate,
  bookings,
  onClose,
  onViewDetails,
  onEdit,
}: {
  dateLabel: string;
  dateStr: string;
  bookings: Booking[];
  onClose: () => void;
  onViewDetails: (b: Booking) => void;
  onEdit: (b: Booking) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-bookings-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.85)] backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] p-6">
          <h2 id="day-bookings-title" className="text-lg font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
            Bookings on {dateLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {bookings.length === 0 ? (
            <p className="text-[rgba(255,255,255,0.65)] text-sm">No bookings on this day.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] p-4 flex items-center justify-between gap-2 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[rgba(255,255,255,0.92)] truncate">{b.eventName}</p>
                  <p className="text-sm text-[rgba(255,255,255,0.65)]">
                    {b.roomName} • {formatBookingTime(b)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { onViewDetails(b); onClose(); }}
                    className="rounded-full border border-[#FFD54A]/50 bg-transparent px-3 py-1.5 text-xs font-medium text-[#FFD54A] transition-all duration-200 hover:bg-[#FFD54A]/10"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => { onEdit(b); onClose(); }}
                    className="rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-3 py-1.5 text-xs font-medium text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:text-white hover:border-[rgba(255,255,255,0.12)]"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)]"
        style={{ borderWidth: "1px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div className="min-w-0">
            <h2 id="booking-details-title" className="truncate text-lg font-semibold text-[var(--text)]">{booking.eventName}</h2>
            <p className="mt-1 text-sm text-[var(--textSecondary)] font-mono">Confirmation #{booking.confirmationNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--textSecondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-[var(--textSecondary)]">Organizer</p>
              <p className="text-[var(--text)] font-medium mt-1">{booking.organizerName}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--textSecondary)]">Status</p>
              <p className="inline-flex rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)] mt-1">{booking.status}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--textSecondary)]">Date</p>
              <p className="text-[var(--text)] font-medium mt-1">{booking.preferredDate}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--textSecondary)]">Time</p>
              <p className="text-[var(--text)] font-medium mt-1">{formatBookingTime(booking)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Room</p>
            <p className="mt-1 text-[var(--textSecondary)]">{booking.roomName} • {getBuildingTicketLabel(booking.building)} • Capacity {booking.capacity}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {booking.avBadges.map((b) => (
                <span key={b} className="inline-flex rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]">{b}</span>
              ))}
              {booking.furnitureLabels && booking.furnitureLabels.split(" • ").map((label) => (
                <span key={label} className="inline-flex rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]">{label}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)] p-6 flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 font-medium text-[var(--textSecondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text)]">Close</button>
          {onEdit && <button type="button" onClick={onEdit} className="rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 font-semibold text-[var(--text)] hover:bg-[var(--border)]/50">Edit</button>}
          {onDelete && (
            <button type="button" onClick={onDelete} className="rounded-full border border-[var(--danger)] bg-[var(--danger)] px-5 py-2.5 font-medium text-white hover:bg-[var(--dangerHover)] inline-flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MyBookingsPage() {
  const { bookings, cancelBooking } = useBookings();
  const [details, setDetails] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [dayModal, setDayModal] = useState<{ dateStr: string; dateLabel: string } | null>(null);

  const hasBookings = bookings.length > 0;
  const list = useMemo(() => bookings, [bookings]);

  const monthGrid = useMemo(
    () => getMonthGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      const d = b.preferredDate;
      if (!map[d]) map[d] = [];
      map[d].push(b);
    }
    return map;
  }, [bookings]);
  const dayModalBookings = dayModal ? (bookingsByDate[dayModal.dateStr] ?? []) : [];

  const prevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else setCalendarMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else setCalendarMonth((m) => m + 1);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>My Bookings</h1>
          <p className="mt-2 text-lg text-[rgba(255,255,255,0.65)]">Your scheduled room reservations.</p>
        </div>
        {hasBookings && (
          <div className="flex rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-[#FFD54A] text-black shadow-lg"
                  : "text-[rgba(255,255,255,0.65)] hover:text-white"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                viewMode === "calendar"
                  ? "bg-[#FFD54A] text-black shadow-lg"
                  : "text-[rgba(255,255,255,0.65)] hover:text-white"
              }`}
            >
              Calendar
            </button>
          </div>
        )}
      </div>

      {!hasBookings ? (
        <div className="rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.50)] backdrop-blur-md py-20 text-center">
          <p className="text-lg font-medium text-[rgba(255,255,255,0.65)]">No bookings yet</p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-full bg-[#FFD54A] px-6 py-3 font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[#F6C445] hover:shadow-[#FFD54A]/25 focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
          >
            Book a Room
          </Link>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-6 sm:p-8 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
              {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] px-4 py-2 text-sm font-medium text-[#FFD54A] transition-all duration-200 hover:border-[#FFD54A]/50 hover:bg-[rgba(17,17,19,0.85)]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] px-4 py-2 text-sm font-medium text-[#FFD54A] transition-all duration-200 hover:border-[#FFD54A]/50 hover:bg-[rgba(17,17,19,0.85)]"
              >
                Next
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[rgba(255,255,255,0.65)]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[80px] rounded-xl bg-[rgba(17,17,19,0.50)]" />;
              }
              const dStr = dateStr(calendarYear, calendarMonth, day);
              const dayBookings = bookingsByDate[dStr] ?? [];
              const label = `${MONTH_NAMES[calendarMonth - 1]} ${day}, ${calendarYear}`;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setDayModal({ dateStr: dStr, dateLabel: label })}
                  className="min-h-[80px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] p-2 text-left transition-all duration-200 hover:border-[#FFD54A]/40 hover:bg-[rgba(17,17,19,0.85)] focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
                >
                  <span className="text-sm font-medium text-[rgba(255,255,255,0.92)]">{day}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayBookings.slice(0, 2).map((b) => (
                      <span
                        key={b.id}
                        className="inline-block max-w-full truncate rounded-lg bg-[#FFD54A]/20 px-1.5 py-0.5 text-[10px] text-[#FFD54A]"
                        title={`${b.roomName} ${formatTimeSlot(b.timeSlot)}`}
                      >
                        {b.roomName} {formatTimeSlot(b.timeSlot)}
                      </span>
                    ))}
                    {dayBookings.length > 2 && (
                      <span className="text-[10px] text-[rgba(255,255,255,0.48)]">+{dayBookings.length - 2}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <article
              key={b.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-6 shadow-lg transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">{b.eventName}</h3>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">{b.organizerName}</p>
                </div>
                <span className="inline-flex rounded-full border border-[#FFD54A]/50 bg-[#FFD54A]/10 px-3 py-1 text-xs font-medium text-[#FFD54A]">
                  Confirmed
                </span>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <p className="text-[rgba(255,255,255,0.65)]">
                  <span className="text-[rgba(255,255,255,0.48)]">Date:</span> {b.preferredDate}
                </p>
                <p className="text-[rgba(255,255,255,0.65)]">
                  <span className="text-[rgba(255,255,255,0.48)]">Time:</span> {formatBookingTime(b)}
                </p>
                <p className="text-[rgba(255,255,255,0.65)]">
                  <span className="text-[rgba(255,255,255,0.48)]">Room:</span> {b.roomName}
                </p>
                <p className="text-[rgba(255,255,255,0.48)] font-mono text-xs">Confirmation #{b.confirmationNumber}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {b.avBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex rounded-full border border-[#FFD54A]/50 bg-[#FFD54A]/10 px-2.5 py-1 text-xs font-medium text-[#FFD54A]"
                  >
                    {badge}
                  </span>
                ))}
                {b.furnitureLabels &&
                  b.furnitureLabels.split(" • ").map((label) => (
                    <span
                      key={label}
                      className="inline-flex rounded-full border border-[#FFD54A]/50 bg-[#FFD54A]/10 px-2.5 py-1 text-xs font-medium text-[#FFD54A]"
                    >
                      {label}
                    </span>
                  ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-5 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={() => setDetails(b)}
                  className="rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[rgba(255,255,255,0.92)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[rgba(255,255,255,0.92)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(b)}
                  className="rounded-full border border-[var(--danger)] bg-[var(--danger)] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--dangerHover)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50 inline-flex items-center gap-2"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {details && (
        <BookingDetailsModal
          booking={details}
          isOpen={!!details}
          onClose={() => setDetails(null)}
          onEdit={() => { setEditing(details); setDetails(null); }}
          onDelete={() => { setDeleting(details); setDetails(null); }}
        />
      )}
      {editing && <EditBookingModal booking={editing} isOpen={!!editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteBookingModal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleting && cancelBooking(deleting.id)}
          eventName={deleting?.eventName}
        />
      )}
      {dayModal && (
        <DayBookingsModal
          dateLabel={dayModal.dateLabel}
          dateStr={dayModal.dateStr}
          bookings={dayModalBookings}
          onClose={() => setDayModal(null)}
          onViewDetails={setDetails}
          onEdit={setEditing}
        />
      )}
    </div>
  );
}

