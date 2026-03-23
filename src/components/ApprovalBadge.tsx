"use client";

import { motion } from "framer-motion";

type Variant = "required" | "pending" | "changes_requested";

export function ApprovalBadge({ variant, className = "" }: { variant: Variant; className?: string }) {
  const label =
    variant === "pending"
      ? "Pending Admin Approval"
      : variant === "changes_requested"
        ? "Changes Requested"
        : "Approval Required";
  return (
    <motion.span
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          variant === "pending"
          ? "border-[var(--primary)]/35 bg-[var(--primary)]/10 text-[var(--primary)]"
          : variant === "changes_requested"
            ? "border-[var(--primary)]/35 bg-[var(--primary)]/10 text-[var(--primary)]"
          : "border-[var(--borderStrong)] bg-[var(--surfaceElevated)]/60 text-[var(--textSecondary)]"
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          variant === "pending" || variant === "changes_requested"
            ? "bg-[var(--primary)]"
            : "bg-[var(--textMuted)]"
        }`}
        aria-hidden
      />
      {label}
    </motion.span>
  );
}

