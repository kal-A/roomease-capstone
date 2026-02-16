"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface DeleteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventName?: string;
}

export function DeleteBookingModal({
  isOpen,
  onClose,
  onConfirm,
  eventName = "this booking",
}: DeleteBookingModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)] p-6"
        style={{ borderWidth: "1px", borderRadius: "var(--radiusLg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Delete booking</h3>
        <p className="mt-2 text-sm text-[var(--textSecondary)]">
          Are you sure you want to delete {eventName}? This cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--textSecondary)] hover:bg-[var(--border)]/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 rounded-xl border-2 border-[var(--danger)] bg-transparent py-2.5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
