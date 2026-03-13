"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getRoomRating, getDisplayReviewCount, submitReview, type ReviewDimension } from "@/lib/reviewsStore";

const DIMENSION_LABELS: Record<ReviewDimension, string> = {
  lighting: "Lighting",
  noise: "Noise level",
  comfort: "Comfort",
  avReliability: "AV reliability",
};

interface RoomRatingProps {
  roomId: string | number;
  /** Compact: just show ⭐ 4.6 and 23 reviews */
  compact?: boolean;
  /** Show form to rate (in modal/detail) */
  showRateForm?: boolean;
  className?: string;
}

function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function RoomRating({ roomId, compact, showRateForm, className = "" }: RoomRatingProps) {
  const { average, count, displayCount } = getRoomRating(roomId);
  const reviewCount = displayCount ?? getDisplayReviewCount(roomId);
  const [dimensions, setDimensions] = useState<Record<ReviewDimension, number>>({
    lighting: 3,
    noise: 3,
    comfort: 3,
    avReliability: 3,
  });
  const [submitted, setSubmitted] = useState(false);

  const setDim = useCallback((dim: ReviewDimension, value: number) => {
    setDimensions((d) => ({ ...d, [dim]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    submitReview(roomId, dimensions);
    setSubmitted(true);
  }, [roomId, dimensions]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className="flex items-center gap-1 text-[var(--primary)]" aria-label={`Rating ${average > 0 ? average.toFixed(1) : "—"} out of 5`}>
          <StarIcon filled />
          <span className="font-semibold">{average > 0 ? average.toFixed(1) : "—"}</span>
        </span>
        <span className="text-[var(--textMuted)]">({reviewCount} reviews)</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[var(--primary)]">
          <StarIcon filled />
          <span className="text-lg font-semibold">{average > 0 ? average.toFixed(1) : "—"}</span>
        </span>
        <span className="text-[var(--textMuted)]">({reviewCount} reviews)</span>
      </div>

      {showRateForm && !submitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
        >
          <p className="text-sm font-medium text-[var(--textSecondary)]">Rate this room</p>
          {(Object.keys(DIMENSION_LABELS) as ReviewDimension[]).map((dim) => (
            <div key={dim} className="flex items-center justify-between gap-4">
              <label className="text-sm text-[var(--text)]">{DIMENSION_LABELS[dim]}</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDim(dim, v)}
                    className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                    aria-label={`${v} star`}
                  >
                    <StarIcon filled={dimensions[dim] >= v} className="text-[var(--primary)]" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primaryText)] hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          >
            Submit rating
          </button>
        </motion.div>
      )}

      {showRateForm && submitted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[var(--success)] font-medium"
        >
          Thanks! Your rating was saved.
        </motion.p>
      )}
    </div>
  );
}
