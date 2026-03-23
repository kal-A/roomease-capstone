"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { EventFormData, Room } from "@/types/booking";
import { DateTime } from "luxon";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import type { BookingStatus } from "@/lib/bookingsStore";

interface ConfirmationPageProps {
  formData: EventFormData;
  room: Room;
  confirmationNumber: string;
  onBookAnother: () => void;
  bookedByName?: string | null;
  bookingStatus?: BookingStatus | string | null;
  /** Club members complete a recommendation request instead of a live booking. */
  flow?: "booking" | "member_request";
}

export function ConfirmationPage({
  formData,
  room,
  confirmationNumber,
  onBookAnother,
  bookedByName,
  bookingStatus,
  flow = "booking",
}: ConfirmationPageProps) {
  const approvalRequired = getRoomMetadataWithDefaults(room.id).approvalRequired === true;
  const durationMin = formData.durationMinutes ?? 60;

  if (flow === "member_request") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mx-auto w-full max-w-[720px] px-6"
      >
        <div className="rounded-xl bg-[var(--surface)] shadow-md border border-[var(--border)] p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-[var(--success)]/15 border-[var(--success)]/35">
              <svg className="h-7 w-7 text-[var(--success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8l-6 6-2-2" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--text)]">Recommendation sent</h1>
            <p className="mt-1 text-sm text-[var(--textSecondary)] max-w-md">
              Your club executive will review the details. If they approve, the room will be booked or submitted for admin approval when required.
            </p>
          </div>
          <dl className="mt-7 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-[var(--textMuted)]">Reference</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text)] font-mono">{confirmationNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--textMuted)]">Room</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{room.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--textMuted)]">Event</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{formData.eventName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--textMuted)]">Requested by</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{bookedByName ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)]"
            >
              Open dashboard
            </Link>
            <Link
              href="/book"
              onClick={onBookAnother}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primaryText)] shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)]"
            >
              Explore more rooms
            </Link>
          </div>
          <p className="mt-6 text-center text-xs text-[var(--textSecondary)]">
            Track club bookings from My Bookings once your executive confirms a reservation.
          </p>
        </div>
      </motion.div>
    );
  }

  const normalizedStatus: BookingStatus = (() => {
    const v = String(bookingStatus ?? "").toLowerCase().trim();
    if (
      v === "pending" ||
      v === "approved" ||
      v === "denied" ||
      v === "confirmed" ||
      v === "changes_requested"
    )
      return v as BookingStatus;
    // Fallback for safety if bookingStatus is missing (shouldn't happen in normal flow).
    return approvalRequired ? "pending" : "confirmed";
  })();

  const { title, subtitle, iconKind } = (() => {
    switch (normalizedStatus) {
      case "confirmed":
        return {
          title: "Room Successfully Booked",
          subtitle: "Your room has been successfully reserved.",
          iconKind: "success" as const,
        };
      case "approved":
        return {
          title: "Booking Approved",
          subtitle: "Your room has been approved and reserved.",
          iconKind: "success" as const,
        };
      case "pending":
        return {
          title: "Booking Submitted for Approval",
          subtitle: "An admin will review your request.",
          iconKind: "pending" as const,
        };
      case "changes_requested":
        return {
          title: "Changes Requested",
          subtitle: "An admin requested updates before approval. Please resubmit with the requested changes.",
          iconKind: "pending" as const,
        };
      case "denied":
        return {
          title: "Booking Denied",
          subtitle: "This request could not be approved.",
          iconKind: "denied" as const,
        };
      default:
        return {
          title: "Room Successfully Booked",
          subtitle: "Your room has been successfully reserved.",
          iconKind: "success" as const,
        };
    }
  })();

  const startAndEnd = useMemo(() => {
    if (!formData.preferredDate || !formData.timeSlot) return null;
    const [year, month, day] = formData.preferredDate.split("-").map((x) => Number(x));
    const [hour, minute] = formData.timeSlot.split(":").map((x) => Number(x));
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const start = DateTime.fromObject({ year, month, day, hour, minute }, { zone: "America/Toronto" });
    const end = start.plus({ minutes: durationMin });
    if (!start.isValid || !end.isValid) return null;
    return { start, end };
  }, [formData.preferredDate, formData.timeSlot, durationMin]);

  const dateLabel = useMemo(() => {
    if (!formData.preferredDate) return "—";
    const [year, month, day] = formData.preferredDate.split("-").map((x) => Number(x));
    const dt = DateTime.fromObject({ year, month, day }, { zone: "America/Toronto" });
    return dt.isValid ? dt.toFormat("cccc, LLLL d") : formData.preferredDate;
  }, [formData.preferredDate]);

  const timeLabel = useMemo(() => {
    if (!startAndEnd) return "—";
    return `${startAndEnd.start.toFormat("h:mm a")} – ${startAndEnd.end.toFormat("h:mm a")}`;
  }, [startAndEnd]);

  const addToCalendarUrl = useMemo(() => {
    if (!startAndEnd) return null;
    const startUtc = startAndEnd.start.toUTC();
    const endUtc = startAndEnd.end.toUTC();

    const googleDates = `${startUtc.toFormat("yyyyLLdd'T'HHmmss'Z'")}/${endUtc.toFormat("yyyyLLdd'T'HHmmss'Z'")}`;
    const title = formData.eventName?.trim() ? formData.eventName : `Room booking: ${room.name}`;
    const details = `Organizer: ${formData.organizerName}\nConfirmation ID: #${confirmationNumber}`;
    const location = room.name;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${googleDates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
      location
    )}&sf=true&output=xml`;
  }, [confirmationNumber, formData.eventName, formData.organizerName, room.name, startAndEnd]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto w-full max-w-[720px] px-6"
    >
      <div className="rounded-xl bg-[var(--surface)] shadow-md border border-[var(--border)] p-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
            className={`flex h-14 w-14 items-center justify-center rounded-full border ${
              iconKind === "pending"
                ? "bg-[var(--primary)]/15 border-[var(--primary)]/35"
                : iconKind === "denied"
                  ? "bg-[var(--danger)]/15 border-[var(--danger)]/35"
                  : "bg-[var(--success)]/15 border-[var(--success)]/35"
            }`}
          >
            {iconKind === "pending" ? (
              <svg className="h-7 w-7 text-[var(--primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 7v5l3 2" />
              </svg>
            ) : iconKind === "denied" ? (
              <svg className="h-7 w-7 text-[var(--danger)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-[var(--success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8l-6 6-2-2" />
              </svg>
            )}
          </motion.div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--textSecondary)]">{subtitle}</p>

          {normalizedStatus === "pending" && (
            <div className="mt-3">
              <ApprovalBadge variant="pending" />
            </div>
          )}
        </div>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[var(--textMuted)]">Room</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{room.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--textMuted)]">Date</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--textMuted)]">Time</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{timeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--textMuted)]">Organizer</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{formData.organizerName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-[var(--textMuted)]">Booked by</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{bookedByName ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/bookings"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primaryText)] shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
          >
            View My Bookings
          </Link>
          <Link
            href="/rooms"
            onClick={onBookAnother}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--primaryBorder)] bg-[var(--primarySubtle)]/20 px-5 py-3 text-sm font-semibold text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primarySubtle)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
          >
            Book Another Room
          </Link>
          {addToCalendarUrl && (
            <a
              href={addToCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="sm:col-span-2 inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:bg-[var(--surfaceElevated)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
            >
              Add to Calendar
            </a>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--textSecondary)]">
          Need to make changes? You can manage your booking anytime.
        </p>
      </div>
    </motion.div>
  );
}
