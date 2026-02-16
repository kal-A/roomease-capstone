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
            <h1 className="text-4xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
              Bookable Rooms
            </h1>
            <p className="mt-2 text-lg text-[rgba(255,255,255,0.65)]">
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
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md px-5 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.48)] transition-all duration-200 focus:border-[#FFD54A]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30 sm:w-auto"
                style={{ minWidth: "28ch", maxWidth: "40ch" }}
                aria-label="Search rooms"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.65)]">
                <span>Sort</span>
                <select
                  value={filters.state.sort}
                  onChange={(e) => filters.setSort(e.target.value as any)}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md px-4 py-2.5 text-sm text-[rgba(255,255,255,0.92)] transition-all duration-200 focus:border-[#FFD54A]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
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
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.92)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(17,17,19,0.85)] focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
              >
                <span>Filters</span>
                {filters.hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFD54A]" />
                )}
              </button>
              <button
                type="button"
                onClick={filters.resetFilters}
                className={`rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30 ${
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
            <span className="text-sm text-[rgba(255,255,255,0.65)]">Active:</span>
            {filters.activeFilterPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => filters.removeFilterByKey(pill.key)}
                className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/40 bg-[#FFD54A]/10 px-3 py-1.5 text-xs font-medium text-[#FFD54A] transition-all duration-200 hover:bg-[#FFD54A]/15"
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

      <p className="mb-6 text-sm text-[rgba(255,255,255,0.65)]">
        Showing {finalRooms.length} of {ROOMS.length} rooms
      </p>

      {finalRooms.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.50)] backdrop-blur-md py-20 text-center">
          <p className="text-lg font-medium text-[rgba(255,255,255,0.65)]">No rooms match your filters.</p>
          <button
            type="button"
            onClick={filters.resetFilters}
            className="mt-6 rounded-full border border-[#FFD54A]/50 bg-transparent px-6 py-3 font-semibold text-[#FFD54A] transition-all duration-200 hover:bg-[#FFD54A]/10 focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/30"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {finalRooms.map((room) => (
            <RoomDashboardCard
              key={room.id}
              room={room}
              onViewDetails={() => setDetailsRoom(room)}
              hoveredRoomId={hoveredRoomId}
              onHoverStart={handleHoverStart(room)}
              onHoverEnd={handleHoverEnd}
            />
          ))}
        </div>
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
              style={{ paddingTop: "max(env(safe-area-inset-top), 3.5rem)", paddingBottom: "2rem", paddingLeft: "2rem", paddingRight: "2rem" }}
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
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Filters</h2>
                  <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                    Refine by capacity, AV, furniture, and building.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--foreground-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
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
