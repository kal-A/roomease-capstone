"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import { AVAndFurnitureSections } from "@/components/AVAndFurnitureSections";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { RoomRating } from "@/components/RoomRating";
import { useCompare } from "@/lib/compareStore";
import type { Room } from "@/types/booking";

interface RoomDashboardCardProps {
  room: Room;
  onViewDetails: () => void;
  hoveredRoomId?: string | number | null;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

const CAP_MAX = 400;

export function RoomDashboardCard({
  room,
  onViewDetails,
  hoveredRoomId,
  onHoverStart,
  onHoverEnd,
}: RoomDashboardCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { isInCompare, toggleCompare } = useCompare();
  const isHovered = hoveredRoomId !== undefined && String(hoveredRoomId) === String(room.id);
  const inCompare = isInCompare(room.id);

  const handleMouseEnter = useCallback(() => onHoverStart?.(), [onHoverStart]);
  const handleMouseLeave = useCallback(() => {
    onHoverEnd?.();
    setQuickViewOpen(false);
  }, [onHoverEnd]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = "roomease.comparePulseSeen";
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <motion.article
        className="card-elevated relative flex flex-col p-6 min-h-[20rem]"
        style={{ borderWidth: "1px", borderRadius: "var(--radiusLg)" }}
        data-room-id={room.id}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Approval badge */}
        {getRoomMetadataWithDefaults(room.id).approvalRequired && (
          <div className="absolute left-4 top-4 z-20">
            <ApprovalBadge variant="required" />
          </div>
        )}
        {/* 3-dot: absolutely positioned top-right, no layout impact */}
        <div className="absolute top-4 right-4 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQuickViewOpen((v) => !v); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surfaceElevated)] border border-[var(--border)] text-[var(--icon)] shadow-sm transition-all duration-200 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] hover:border-[var(--primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              aria-expanded={quickViewOpen}
              aria-haspopup="true"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <circle cx="4" cy="10" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="16" cy="10" r="1.5" />
              </svg>
              <span className="sr-only">Room actions</span>
            </button>
            <AnimatePresence>
              {quickViewOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] py-1 shadow-[var(--shadowLg)] z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" onClick={() => { onViewDetails(); setQuickViewOpen(false); }} className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors">View Details</button>
                  <button type="button" onClick={() => { toggleCompare(room.id); setQuickViewOpen(false); }} className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors">{inCompare ? "Remove from Compare" : "Add to Compare"}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content: reserve space so 3-dot never covers title/capacity */}
        <div className="pr-12">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-lg font-semibold tracking-tight text-[var(--text)]">{room.name}</h3>
          </div>
          <span className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--surfaceElevated)] px-2.5 py-1 text-xs font-medium text-[var(--textSecondary)]" style={{ borderRadius: "var(--radiusSm)" }}>
            {getBuildingTicketLabel(room.building)}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-[var(--primary)]">{room.capacity}</span>
            <span className="text-sm text-[var(--textMuted)]">capacity</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden" style={{ borderRadius: "var(--radiusSm)" }}>
            <div
              className="h-full rounded-full bg-[var(--primary)]/60 transition-all duration-300"
              style={{ width: `${Math.min(100, (room.capacity / CAP_MAX) * 100)}%`, borderRadius: "var(--radiusSm)" }}
            />
          </div>
        </div>
        <div className="mt-3">
          <RoomRating roomId={room.id} compact />
        </div>
        <div className="mt-4 space-y-3">
          <AVAndFurnitureSections room={room} animatedBadges />
        </div>

        {/* Desktop: only "Book this room" — visible on hover (subtle overlay) or always as bar */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <Link
            href={`/book?roomId=${encodeURIComponent(String(room.id))}`}
            className="flex h-10 w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold shadow-sm transition-all duration-200 hover:bg-[var(--primaryHover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] active:scale-[0.98]"
            style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
          >
            Book this room
          </Link>
        </div>

        {/* Mobile: Quick view */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] sm:hidden">
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            className="rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/15 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          >
            Quick view
          </button>
        </div>
      </motion.article>

      {/* Mobile quick-view sheet */}
      <AnimatePresence>
        {quickViewOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-view-title"
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)] p-6 pb-8 sm:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <h2 id="quick-view-title" className="text-lg font-semibold text-[var(--text)]">{room.name}</h2>
              <p className="mt-1 text-sm text-[var(--textSecondary)]">{getBuildingTicketLabel(room.building)} · Capacity {room.capacity}</p>
              <div className="mt-4 space-y-2">
                <AVAndFurnitureSections room={room} animatedBadges={false} compact />
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
                <Link href={`/book?roomId=${encodeURIComponent(String(room.id))}`} className="flex w-full items-center justify-center rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold hover:bg-[var(--primaryHover)] hover:shadow-md" style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}>Book this room</Link>
                <button type="button" onClick={() => { onViewDetails(); setQuickViewOpen(false); }} className="flex w-full items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-6 py-3.5 text-sm font-semibold text-[var(--text)]">View details</button>
                <button type="button" onClick={() => { toggleCompare(room.id); setQuickViewOpen(false); }} className="flex w-full items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-6 py-3.5 text-sm font-medium text-[var(--textSecondary)]">{inCompare ? "Remove from compare" : "Add to compare"}</button>
                <button type="button" onClick={() => setQuickViewOpen(false)} className="flex w-full items-center justify-center rounded-full border border-[var(--border)] px-6 py-3.5 text-sm text-[var(--textSecondary)] sm:hidden">Close</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
