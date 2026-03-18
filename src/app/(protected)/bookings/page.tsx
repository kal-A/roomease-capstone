"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useBookings, type Booking, formatBookingTime } from "@/lib/bookingsStore";
import { EditBookingModal } from "@/components/EditBookingModal";
import { DeleteBookingModal } from "@/components/DeleteBookingModal";
import { EmptyState } from "@/components/EmptyState";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { DateTime } from "luxon";
import { ROOMS } from "@/data/rooms";
import { formatFurniture } from "@/lib/furniture";
import {
  formatTimeSlot,
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
  type Room,
} from "@/types/booking";

type ViewMode = "list" | "calendar";

type MineBookingRow = {
  id: string | number;
  room_id?: string | number | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  event_name?: string | null;
  organizer_name?: string | null;
  booker_email?: string | null;
  group_size?: number | null;
  created_at?: string | null;
  event_type?: string | null;

  // Optional camelCase fallbacks (in case DB driver/transform changes)
  roomId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  eventName?: string | null;
  organizerName?: string | null;
  bookerEmail?: string | null;
  groupSize?: number | null;
  createdAt?: string | null;
  eventType?: string | null;
};

function statusUi(status: Booking["status"]): { label: string; badgeClass: string; subtitle: string } {
  switch (status) {
    case "pending":
      return {
        label: "Pending Approval",
        subtitle: "Awaiting admin review",
        badgeClass: "border-[var(--borderStrong)] bg-[var(--surfaceElevated)] text-[var(--textSecondary)]",
      };
    case "approved":
      return {
        label: "Approved",
        subtitle: "Approved by admin",
        badgeClass: "border-[var(--successBorder)] bg-[var(--successBg)] text-[var(--success)]",
      };
    case "denied":
      return {
        label: "Denied",
        subtitle: "Booking request was denied",
        badgeClass: "border-[var(--dangerBorder)] bg-[var(--dangerBg)] text-[var(--danger)]",
      };
    default:
      return {
        label: "Confirmed",
        subtitle: "Room reserved successfully",
        badgeClass: "border-[var(--successBorder)] bg-[var(--successBg)] text-[var(--success)]",
      };
  }
}

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
        className="relative z-10 w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 id="day-bookings-title" className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Bookings on {dateLabel}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {bookings.length === 0 ? (
            <p className="text-[var(--textSecondary)] text-sm">No bookings on this day.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between gap-2 transition-all duration-200 hover:border-[var(--borderStrong)]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{b.eventName}</p>
                  <p className="text-sm text-[var(--textSecondary)]">
                    {b.roomName} • {formatBookingTime(b)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { onViewDetails(b); onClose(); }}
                    className="rounded-full border border-[var(--primary)]/50 bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primary)]/10"
                  >
                    View
                  </button>
                  {(b.status === "pending" || b.status === "approved" || b.status === "confirmed") && (
                    <button
                      type="button"
                      onClick={() => { onEdit(b); onClose(); }}
                      className="rounded-full border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--textSecondary)] transition-all duration-200 hover:text-[var(--text)] hover:border-[var(--borderStrong)]"
                    >
                      Edit
                    </button>
                  )}
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
              <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium mt-1 ${statusUi(booking.status).badgeClass}`}>
                {statusUi(booking.status).label}
              </p>
              {booking.requiresApproval && booking.status === "pending" && (
                <div className="mt-2">
                  <ApprovalBadge variant="pending" />
                </div>
              )}
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
            <button type="button" onClick={onDelete} className="rounded-full border border-[var(--danger)] bg-transparent px-5 py-2.5 font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 inline-flex items-center gap-2">
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
  const { bookings, replaceBookings } = useBookings();
  const [details, setDetails] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [dayModal, setDayModal] = useState<{ dateStr: string; dateLabel: string } | null>(null);

  const roomsById = useMemo(() => new Map(ROOMS.map((r) => [String(r.id), r])), []);
  const bookingsRef = useRef<Booking[]>(bookings);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineError, setMineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" } | null>(null);

  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const showToast = useCallback((message: string, variant: "success" | "danger") => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refetchMine = useCallback(async () => {
    const res = await fetch("/api/bookings/mine", { method: "GET" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      const msg = typeof json.error === "string" ? json.error : "Could not refresh bookings.";
      throw new Error(msg);
    }

    const json = (await res.json().catch(() => ({ bookings: [] }))) as { bookings?: unknown[] };
    const rows = Array.isArray(json.bookings) ? json.bookings : [];

    const mapped: Booking[] = rows.map((row) => {
      const b = row as MineBookingRow;
      const backendId = String(b.id);
      const roomId = String(b.room_id ?? b.roomId ?? "");
      const room = roomsById.get(roomId) ?? null;

      const statusRaw = String(b.status ?? "").toLowerCase().trim();
      const status =
        statusRaw === "pending" || statusRaw === "approved" || statusRaw === "denied" || statusRaw === "confirmed"
          ? statusRaw
          : ("pending" as Booking["status"]);

      const requiresApproval = status !== "confirmed";

      const startIso = (b.start_time ?? b.startTime ?? "") as string;
      const endIso = (b.end_time ?? b.endTime ?? "") as string;
      const start = startIso ? DateTime.fromISO(startIso).setZone("America/Toronto") : DateTime.invalid("invalid");
      const end = endIso ? DateTime.fromISO(endIso).setZone("America/Toronto") : DateTime.invalid("invalid");
      const preferredDate = start.isValid ? start.toFormat("yyyy-LL-dd") : "";
      const timeSlot = start.isValid ? start.toFormat("HH:mm") : "";
      const durationMinutesRaw = start.isValid && end.isValid ? end.diff(start, "minutes").minutes : 60;
      const durationMinutes = Number.isFinite(durationMinutesRaw) ? Math.max(1, Math.round(durationMinutesRaw)) : 60;

      const existing = bookingsRef.current.find((x) => String(x.backendId ?? "") === backendId);
      const confirmationNumber = existing?.confirmationNumber ?? `CONF-${backendId.slice(-4)}`;

      const furnitureShort = room ? formatFurniture(room.furniture).short : "";
      const furnitureLabels = furnitureShort ? furnitureShort.split("; ").join(" • ") : "";

      const avBadges: string[] = [];
      if (room) {
        if (roomIsStreamingRecordingCapable(room as Room)) avBadges.push("Streaming & Recording Ready");
        if (roomIsElectronicClassroom(room as Room)) avBadges.push("Electronic Classroom");
        if (roomHasDocumentCamera(room as Room)) avBadges.push("Document Camera Available");
      }

      const roomName = room?.name ?? roomId;
      const building = room?.building ?? "";
      const capacity = Number(room?.capacity ?? 0);

      return {
        id: backendId,
        backendId,
        status,
        requiresApproval,
        confirmationNumber,
        createdAtIso: b.created_at ?? b.createdAt ? new Date(String(b.created_at ?? b.createdAt)).toISOString() : new Date().toISOString(),
        eventName: String(b.event_name ?? b.eventName ?? ""),
        organizerName: String(b.organizer_name ?? b.organizerName ?? ""),
        organizerEmail: b.booker_email ?? b.bookerEmail ? String(b.booker_email ?? b.bookerEmail) : undefined,
        eventType: String(b.event_type ?? b.eventType ?? ""),
        preferredDate,
        timeSlot,
        durationMinutes,
        groupSize: Number(b.group_size ?? b.groupSize ?? 0),
        roomId,
        roomName,
        building,
        capacity,
        furnitureLabels,
        avBadges,
      };
    });

    replaceBookings(mapped);
  }, [replaceBookings, roomsById]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMineLoading(true);
        setMineError(null);
        await refetchMine();
      } catch (e) {
        if (cancelled) return;
        setMineError(e instanceof Error ? e.message : "Could not load bookings.");
      } finally {
        if (!cancelled) setMineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refetchMine]);

  const hasBookings = !mineLoading && bookings.length > 0;
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
      {toast && (
        <div
          className={`fixed right-5 top-5 z-[100] rounded-2xl border px-4 py-3 shadow-lg ${
            toast.variant === "success"
              ? "border-[var(--successBorder)] bg-[var(--successBg)] text-[var(--success)]"
              : "border-[var(--dangerBorder)] bg-[var(--dangerBg)] text-[var(--danger)]"
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>My Bookings</h1>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">Your scheduled room reservations.</p>
        </div>
        {hasBookings && (
          <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-black shadow-lg"
                  : "text-[var(--textSecondary)] hover:text-[var(--text)]"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                viewMode === "calendar"
                  ? "bg-[var(--primary)] text-black shadow-lg"
                  : "text-[var(--textSecondary)] hover:text-[var(--text)]"
              }`}
            >
              Calendar
            </button>
          </div>
        )}
      </div>

      {mineError && (
        <div className="mb-4 rounded-2xl border border-[var(--danger)] bg-[var(--dangerBg)] p-4 text-[var(--textSecondary)]">
          {mineError}
        </div>
      )}

      {mineLoading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
          <p className="text-[var(--textSecondary)]">Loading your bookings...</p>
        </div>
      ) : !hasBookings ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="No bookings yet"
          description="Your scheduled room reservations will appear here."
          suggestion="Book a room to get started."
          action={
            <Link href="/book" className="inline-flex rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-black shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]">
              Book a Room
            </Link>
          }
        />
      ) : viewMode === "calendar" ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-6 sm:p-8 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--surfaceElevated)]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--surfaceElevated)]"
              >
                Next
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--textSecondary)]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[80px] rounded-xl bg-[var(--surface)]" />;
              }
              const dStr = dateStr(calendarYear, calendarMonth, day);
              const dayBookings = bookingsByDate[dStr] ?? [];
              const label = `${MONTH_NAMES[calendarMonth - 1]} ${day}, ${calendarYear}`;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setDayModal({ dateStr: dStr, dateLabel: label })}
                  className="min-h-[80px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--surfaceElevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                >
                  <span className="text-sm font-medium text-[var(--text)]">{day}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayBookings.slice(0, 2).map((b) => (
                      <span
                        key={b.id}
                        className="inline-block max-w-full truncate rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 px-1.5 py-0.5 text-[10px] text-[var(--primary)] font-medium"
                        title={`${b.roomName} ${formatTimeSlot(b.timeSlot)}`}
                      >
                        {b.roomName} {formatTimeSlot(b.timeSlot)}
                      </span>
                    ))}
                    {dayBookings.length > 2 && (
                      <span className="text-[10px] text-[var(--textMuted)]">+{dayBookings.length - 2}</span>
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
              className="card-elevated p-6"
              style={{ borderRadius: "var(--radiusLg)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight text-[var(--text)]">{b.eventName}</h3>
                  <p className="mt-1 text-sm text-[var(--textSecondary)]">{b.organizerName}</p>
                  <p className="mt-1 text-xs text-[var(--textMuted)]">{statusUi(b.status).subtitle}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusUi(b.status).badgeClass}`}>
                  {statusUi(b.status).label}
                </span>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <p className="text-[var(--textSecondary)]">
                  <span className="text-[var(--textMuted)]">Date:</span> {b.preferredDate}
                </p>
                <p className="text-[var(--textSecondary)]">
                  <span className="text-[var(--textMuted)]">Time:</span> {formatBookingTime(b)}
                </p>
                <p className="text-[var(--textSecondary)]">
                  <span className="text-[var(--textMuted)]">Room:</span> {b.roomName}
                </p>
                <p className="text-[var(--textMuted)] font-mono text-xs">Confirmation #{b.confirmationNumber}</p>
                {b.requiresApproval && b.status === "pending" && (
                  <div className="pt-1">
                    <ApprovalBadge variant="pending" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {b.avBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                  >
                    {badge}
                  </span>
                ))}
                {b.furnitureLabels &&
                  b.furnitureLabels.split(" • ").map((label) => (
                    <span
                      key={label}
                      className="inline-flex rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                    >
                      {label}
                    </span>
                  ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-5 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setDetails(b)}
                  className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--border)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                >
                  View details
                </button>
                {(b.status === "pending" || b.status === "approved" || b.status === "confirmed") && (
                  <button
                    type="button"
                    onClick={() => setEditing(b)}
                    className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--border)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleting(b)}
                  className="rounded-full border border-[var(--danger)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition-all duration-200 hover:border-[var(--dangerHover)] hover:bg-[var(--danger)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50 inline-flex items-center gap-2"
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
      {editing && (
        <EditBookingModal
          booking={editing}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSaveSuccess={async () => {
            await refetchMine();
            showToast("Booking updated", "success");
          }}
          onDeleteSuccess={async () => {
            await refetchMine();
            showToast("Booking deleted", "success");
          }}
        />
      )}
      {deleting && (
        <DeleteBookingModal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (!deleting) return;
            if (!deleting.backendId) throw new Error("This booking cannot be deleted (missing backend id).");
            const res = await fetch(`/api/bookings/${deleting.backendId}`, { method: "DELETE" });
            if (!res.ok) {
              const json = (await res.json().catch(() => ({}))) as { error?: unknown };
              const msg = typeof json.error === "string" ? json.error : "Delete failed.";
              throw new Error(msg);
            }
            await refetchMine();
            showToast("Booking deleted", "success");
          }}
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

