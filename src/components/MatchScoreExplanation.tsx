"use client";

import { motion } from "framer-motion";
import type { MatchReason } from "@/lib/demo";
import { getMatchScore, type MatchContext } from "@/lib/demo";
import type { Room } from "@/types/booking";

interface MatchScoreExplanationProps {
  room: Room;
  context?: MatchContext;
  /** Show compact single line on cards */
  compact?: boolean;
  className?: string;
}

const chipVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.25 },
  }),
};

export function MatchScoreExplanation({
  room,
  context,
  compact,
  className = "",
}: MatchScoreExplanationProps) {
  const { score, reasons } = getMatchScore(room, context);

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span className="text-sm font-semibold text-[var(--primary)]">
          Match: {score}%
        </span>
        {reasons.slice(0, 3).map((r, i) => (
          <motion.span
            key={r}
            custom={i}
            variants={chipVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/12 px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]"
          >
            <span className="text-[var(--success)]" aria-hidden>✓</span> {r}
          </motion.span>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--textSecondary)]">Match Score</span>
        <span className="text-lg font-semibold text-[var(--primary)]">{score}%</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((reason, i) => (
          <motion.span
            key={reason}
            custom={i}
            variants={chipVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
          >
            <span className="text-[var(--success)]" aria-hidden>✓</span>
            {reason}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
