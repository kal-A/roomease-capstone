"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { EventFormData } from "@/types/booking";
import type { Room } from "@/types/booking";
import { BookingSummary } from "./BookingSummary";

interface ConfirmationPageProps {
  formData: EventFormData;
  room: Room;
  confirmationNumber: string;
  onBookAnother: () => void;
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

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center max-w-lg mx-auto px-4 py-3 gap-2.5">
      <div className="text-center flex-shrink-0">
        <motion.div
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/15 ring-2 ring-[var(--primary)]/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <svg className="h-4.5 w-4.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }} />
          </svg>
        </motion.div>
        <h1 className="mt-1.5 text-base font-bold text-[var(--text)]">Booking Confirmed</h1>
        <p className="mt-0.5 text-xs text-[var(--textSecondary)]">Your confirmation ticket is below.</p>
      </div>
      <div className="flex-1 min-h-0 w-full [&_.rounded-xl]:py-2.5 [&_.rounded-xl]:px-3 [&_.rounded-xl]:text-sm">
        <BookingSummary formData={formData} room={room} confirmationNumber={confirmationNumber} ticketStyle />
      </div>
      <div className="flex flex-wrap justify-center gap-2 flex-shrink-0 pt-1">
        <Link href="/bookings" className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold shadow-sm hover:bg-[var(--primaryHover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]" style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}>
          View My Bookings
        </Link>
        <button type="button" onClick={onBookAnother} className="rounded-xl border-2 border-[var(--primaryBorder)] bg-transparent px-5 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primarySubtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]">
          Book Another Room
        </button>
        <button type="button" onClick={handleCopyConfirmation} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--textSecondary)] hover:bg-[var(--borderDivider)] hover:text-[var(--textPrimary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]">
          {copied ? "Copied!" : "Copy confirmation number"}
        </button>
      </div>
    </div>
  );
}
