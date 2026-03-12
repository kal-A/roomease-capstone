"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoomDashboardCard } from "@/components/RoomDashboardCard";
import { RoomDetailsModal } from "@/components/RoomDetailsModal";
import {
  filterAndSortRooms,
  RoomsFilters,
  useRoomsFilters,
} from "@/components/RoomsFilters";
import { EmptyState } from "@/components/EmptyState";
import { ROOMS } from "@/data/rooms";
import type { Room } from "@/types/booking";

export default function RoomsDashboardPage() {
  const filters = useRoomsFilters();
  const [detailsRoom, setDetailsRoom] = useState<Room | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const finalRooms = useMemo(() => {
    return filterAndSortRooms(ROOMS, filters.state);
  }, [filters.state]);

  const handleHoverStart = useCallback((room: Room) => () => setHoveredRoomId(room.id), []);
  const handleHoverEnd = useCallback(() => setHoveredRoomId(null), []);

  useEffect(() => {
    if (filtersOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [filtersOpen]);

  return (
    <div className="relative bg-transparent">
      <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10 bg-transparent">
        {/* Top toolbar */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
              Bookable Rooms
            </h1>
            <p className="mt-2 text-lg text-[var(--textSecondary)]">
              Browse capacity and features across campus.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-1 items-center gap-2">
              <input
                type="search"
                value={filters.state.search}
                onChange={(e) => filters.setSearch(e.target.value)}
                placeholder="Search by room or building..."
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-3 text-[var(--text)] placeholder-[var(--textMuted)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] sm:w-auto"
                style={{ minWidth: "28ch", maxWidth: "40ch" }}
                aria-label="Search rooms"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--textSecondary)]">
                <span>Sort</span>
                <select
                  value={filters.state.sort}
                  onChange={(e) => filters.setSort(e.target.value as any)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-4 py-2.5 text-sm text-[var(--text)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                >
                  <option value="recommended">Recommended</option>
                  <option value="capacity-low">Capacity: Low → High</option>
                  <option value="capacity-high">Capacity: High → Low</option>
                  <option value="name-az">Name: A → Z</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--surfaceElevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              >
                <span>Filters</span>
                {filters.hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </button>
              <button
                type="button"
                onClick={filters.resetFilters}
                className={`rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                  filters.hasActiveFilters ? "" : "opacity-0 pointer-events-none"
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {filters.activeFilterPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--textSecondary)]">Active:</span>
            {filters.activeFilterPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => filters.removeFilterByKey(pill.key)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primary)]/15"
              >
                <span>{pill.label}</span>
                <span aria-hidden="true" className="text-[10px]">
                  ✕
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mb-6 text-sm text-[var(--textSecondary)]">
        Showing {finalRooms.length} of {ROOMS.length} rooms
      </p>

      {finalRooms.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          }
          title="No rooms match your filters"
          description="Try adjusting your filters or search to see more options."
          suggestion="You can clear all filters to browse the full list."
          action={
            <button
              type="button"
              onClick={filters.resetFilters}
              className="rounded-full border-2 border-[var(--primary)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primary)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {finalRooms.map((room, index) => (
            <motion.div key={room.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <RoomDashboardCard
                room={room}
                onViewDetails={() => setDetailsRoom(room)}
                hoveredRoomId={hoveredRoomId}
                onHoverStart={handleHoverStart(room)}
                onHoverEnd={handleHoverEnd}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {detailsRoom && (
        <RoomDetailsModal
          room={detailsRoom}
          isOpen
          onClose={() => setDetailsRoom(null)}
          showStartBooking
        />
      )}

      {/* Filter drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setFiltersOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              className="fixed inset-0 left-[auto] right-0 z-50 w-full max-w-md border-l border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowXl)] overflow-y-auto"
              style={{ paddingTop: "max(env(safe-area-inset-top), 5.5rem)", paddingBottom: "2rem", paddingLeft: "2rem", paddingRight: "2rem" }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              role="dialog"
              aria-modal="true"
              aria-label="Room filters"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">Filters</h2>
                  <p className="mt-1 text-sm text-[var(--textSecondary)]">
                    Refine by capacity, AV, furniture, and building.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                >
                  Close
                </button>
              </div>
              <RoomsFilters
                state={filters.state}
                setSearch={filters.setSearch}
                setBuilding={filters.setBuilding}
                toggleCapacityBucket={filters.toggleCapacityBucket}
                setStreamingOnly={filters.setStreamingOnly}
                setElectronicOnly={filters.setElectronicOnly}
                setDocCamOnly={filters.setDocCamOnly}
                toggleFurniture={filters.toggleFurniture}
                setSort={filters.setSort}
                buildingModalOpen={filters.buildingModalOpen}
                setBuildingModalOpen={filters.setBuildingModalOpen}
                buildingsList={filters.buildingsList}
                hasActiveFilters={filters.hasActiveFilters}
                onReset={filters.resetFilters}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
