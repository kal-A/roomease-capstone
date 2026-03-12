"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { EventFormData } from "@/types/booking";
import type { Room } from "@/types/booking";
import { BookingSummary } from "./BookingSummary";
import { formatTimeSlot, timeToMinutes } from "@/types/booking";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { AV_NEED_OPTIONS } from "@/types/booking";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import { ApprovalBadge } from "@/components/ApprovalBadge";

interface ConfirmationPageProps {
  formData: EventFormData;
  room: Room;
  confirmationNumber: string;
  onBookAnother: () => void;
}

function minutesToLabel(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toTimeRangeLabel(timeSlot: string, durationMinutes: number): { start: string; end: string } {
  const startMin = timeToMinutes(timeSlot);
  const endMin = startMin + durationMinutes;
  return { start: minutesToLabel(startMin), end: minutesToLabel(endMin) };
}

export function ConfirmationPage({
  formData,
  room,
  confirmationNumber,
  onBookAnother,
}: ConfirmationPageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyConfirmation = useCallback(() => {
    navigator.clipboard.writeText(confirmationNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [confirmationNumber]);

  const durationMin = formData.durationMinutes ?? 60;
  const timeRange = formData.timeSlot ? toTimeRangeLabel(formData.timeSlot, durationMin) : null;
  const buildingLabel = getBuildingTicketLabel(room.building);
  const invited = (formData.participantEmails ?? []).filter(Boolean);
  const avNeeds = (formData.avNeedsEnabled ? (formData.avNeeds ?? []) : []).filter((k) => k !== "none");
  const avLabels = avNeeds
    .map((k) => AV_NEED_OPTIONS.find((o) => o.value === k)?.label)
    .filter((x): x is string => !!x);
  const furniture = (formData.furnitureNeedsEnabled ? (formData.furnitureNeeds ?? []) : []).filter(Boolean);
  const approvalRequired = getRoomMetadataWithDefaults(room.id).approvalRequired === true;
  const isPending = approvalRequired;

  const container = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="mx-auto w-full max-w-[920px]"
    >
      <div
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-[var(--shadowLg)] sm:p-6"
        style={{ borderRadius: "var(--radiusXl)" }}
      >
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <div className="text-center sm:text-left">
            <motion.div variants={item} className="flex items-center justify-center gap-3 sm:justify-start">
              <motion.div
                className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
                  isPending ? "bg-[var(--surfaceElevated)]/70 ring-1 ring-[var(--borderStrong)]" : "bg-[var(--primary)]/12 ring-2 ring-[var(--primary)]/35"
                }`}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {isPending ? (
                  <svg className="h-6 w-6 text-[var(--primary)]" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <motion.path
                      d="M12 6v6l4 2"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.08, duration: 0.42, ease: "easeOut" }}
                    />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} opacity="0.35" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.08, duration: 0.42, ease: "easeOut" }}
                    />
                  </svg>
                )}
              </motion.div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                  {isPending ? "Booking submitted for approval" : "Room successfully booked"}
                </h1>
                <p className="mt-0.5 text-sm text-[var(--textSecondary)]">
                  Confirmation ID <span className="font-semibold text-[var(--primary)]">#{confirmationNumber}</span>
                </p>
                {approvalRequired && (
                  <div className="mt-2">
                    <ApprovalBadge variant="pending" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <Link
              href="/bookings"
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
              style={{
                color: "var(--primaryText)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 12px var(--primaryGlow)",
              }}
            >
              View My Bookings
            </Link>
            <button
              type="button"
              onClick={onBookAnother}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-[var(--primaryBorder)] bg-[var(--primarySubtle)]/20 px-5 py-2.5 text-sm font-semibold text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primarySubtle)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
            >
              Book Another Room
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:bg-[var(--surfaceElevated)] hover:text-[var(--text)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
            >
              Back to Home
            </Link>
          </motion.div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Summary */}
          <motion.section variants={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)]/40 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">Booking summary</h2>
              <button
                type="button"
                onClick={handleCopyConfirmation}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--textSecondary)] transition-all duration-200 hover:bg-[var(--surfaceElevated)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
              >
                {copied ? "Copied" : "Copy ID"}
              </button>
            </div>

            <motion.ul variants={container} initial="hidden" animate="visible" className="grid gap-2 text-sm">
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Room</span>
                <span className="text-[var(--text)] font-medium text-right">{room.name}</span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Building</span>
                <span className="text-[var(--text)] text-right">{buildingLabel}</span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Date</span>
                <span className="text-[var(--text)] text-right">{formData.preferredDate}</span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Time</span>
                <span className="text-[var(--text)] text-right">
                  {timeRange ? `${timeRange.start} – ${timeRange.end}` : formatTimeSlot(formData.timeSlot)}
                </span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Event</span>
                <span className="text-[var(--text)] font-medium text-right">{formData.eventName}</span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Organizer</span>
                <span className="text-[var(--text)] text-right">{formData.organizerName}</span>
              </motion.li>
              <motion.li variants={item} className="flex items-start justify-between gap-4">
                <span className="text-[var(--textMuted)]">Group size</span>
                <span className="text-[var(--text)] text-right">{formData.groupSize}</span>
              </motion.li>

              {invited.length > 0 && (
                <motion.li variants={item} className="flex items-start justify-between gap-4">
                  <span className="text-[var(--textMuted)]">Participants</span>
                  <span className="text-[var(--text)] text-right">{invited.length} invited</span>
                </motion.li>
              )}

              {(avLabels.length > 0 || furniture.length > 0) && (
                <motion.li variants={item} className="flex items-start justify-between gap-4">
                  <span className="text-[var(--textMuted)]">Requests</span>
                  <span className="text-[var(--text)] text-right">
                    {avLabels.length > 0 && <span className="block">{avLabels.join(" · ")}</span>}
                    {furniture.length > 0 && <span className="block">{furniture.join(" · ")}</span>}
                  </span>
                </motion.li>
              )}
            </motion.ul>

            {/* keep existing component for consistency (embedded, no extra square) */}
            <div className="hidden">
              <BookingSummary formData={formData} room={room} confirmationNumber={confirmationNumber} ticketStyle embedded />
            </div>
          </motion.section>

          {/* What happens next */}
          <motion.section variants={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)]/40 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-[var(--text)]">What happens next?</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Booking saved</p>
                  <p className="text-xs text-[var(--textSecondary)]">It will appear in My Bookings immediately.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${invited.length > 0 ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--border)]/40 text-[var(--textMuted)]"}`}>
                  {invited.length > 0 ? "✓" : "—"}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Participants notified</p>
                  <p className="text-xs text-[var(--textSecondary)]">
                    {invited.length > 0 ? `Invitations sent to ${invited.length} participant${invited.length === 1 ? "" : "s"}.` : "No participants were added."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${approvalRequired ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--success)]/15 text-[var(--success)]"}`}>
                  {approvalRequired ? "!" : "✓"}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {approvalRequired ? "Admin review required" : "Room reserved"}
                  </p>
                  <p className="text-xs text-[var(--textSecondary)]">
                    {approvalRequired ? "An admin will review your request shortly." : "Your time slot is now reserved."}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
