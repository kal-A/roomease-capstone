"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BuildingModal } from "@/components/BuildingModal";
import { FURNITURE_LABELS } from "@/lib/furniture";
import { getBuildingsFromRooms, ROOMS } from "@/data/rooms";
import { getBuildingTicketLabel } from "@/lib/buildings";
import type { Room } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { furnitureLabelsFromCodes } from "@/lib/furniture";

export type SortOption = "recommended" | "capacity-low" | "capacity-high" | "name-az";

export type CapacityBucket = "small" | "medium" | "large";

export interface RoomsFilterState {
  search: string;
  building: string;
  /** Capacity filter: Small (0–50), Medium (51–150), Large (151+). Empty = show all; OR logic when multiple selected. */
  capacityBuckets: CapacityBucket[];
  streamingOnly: boolean;
  electronicOnly: boolean;
  docCamOnly: boolean;
  furnitureSelected: string[];
  sort: SortOption;
}

const defaultFilters: RoomsFilterState = {
  search: "",
  building: "",
  capacityBuckets: [],
  streamingOnly: false,
  electronicOnly: false,
  docCamOnly: false,
  furnitureSelected: [],
  sort: "recommended",
};

function roomInCapacityBucket(room: Room, bucket: CapacityBucket): boolean {
  const cap = room.capacity;
  if (bucket === "small") return cap <= 50;
  if (bucket === "medium") return cap >= 51 && cap <= 150;
  return cap >= 151;
}

const buildingsList = getBuildingsFromRooms(ROOMS);
const FURNITURE_OPTIONS = Object.values(FURNITURE_LABELS);

export function useRoomsFilters() {
  const [state, setState] = useState<RoomsFilterState>(defaultFilters);
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);

  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search })), []);
  const setBuilding = useCallback((building: string) => setState((s) => ({ ...s, building })), []);
  const toggleCapacityBucket = useCallback((bucket: CapacityBucket) => {
    setState((s) => ({
      ...s,
      capacityBuckets: s.capacityBuckets.includes(bucket)
        ? s.capacityBuckets.filter((b) => b !== bucket)
        : [...s.capacityBuckets, bucket],
    }));
  }, []);
  const setStreamingOnly = useCallback((streamingOnly: boolean) => setState((s) => ({ ...s, streamingOnly })), []);
  const setElectronicOnly = useCallback((electronicOnly: boolean) => setState((s) => ({ ...s, electronicOnly })), []);
  const setDocCamOnly = useCallback((docCamOnly: boolean) => setState((s) => ({ ...s, docCamOnly })), []);
  const setSort = useCallback((sort: SortOption) => setState((s) => ({ ...s, sort })), []);

  const toggleFurniture = useCallback((label: string) => {
    setState((s) => ({
      ...s,
      furnitureSelected: s.furnitureSelected.includes(label)
        ? s.furnitureSelected.filter((l) => l !== label)
        : [...s.furnitureSelected, label],
    }));
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      state.search !== defaultFilters.search ||
      state.building !== defaultFilters.building ||
      state.capacityBuckets.length !== 0 ||
      state.streamingOnly !== defaultFilters.streamingOnly ||
      state.electronicOnly !== defaultFilters.electronicOnly ||
      state.docCamOnly !== defaultFilters.docCamOnly ||
      state.furnitureSelected.length !== 0 ||
      state.sort !== defaultFilters.sort
    );
  }, [state]);

  const resetFilters = useCallback(
    () => setState(() => ({ ...defaultFilters })),
    []
  );

  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (state.building) {
      pills.push({
        key: "building",
        label: `Building: ${getBuildingTicketLabel(state.building)}`,
      });
    }
    state.capacityBuckets.forEach((b) => {
      const labels: Record<CapacityBucket, string> = {
        small: "Small (0–50)",
        medium: "Medium (51–150)",
        large: "Large (151+)",
      };
      pills.push({ key: `capacity-${b}`, label: labels[b] });
    });
    if (state.streamingOnly) pills.push({ key: "streaming", label: "Streaming & Recording" });
    if (state.electronicOnly) pills.push({ key: "electronic", label: "Electronic Classroom" });
    if (state.docCamOnly) pills.push({ key: "doccam", label: "Document Camera" });
    state.furnitureSelected.forEach((f) => {
      pills.push({ key: `furniture-${f}`, label: f });
    });
    if (state.sort !== "recommended") {
      const sortLabels: Record<SortOption, string> = {
        recommended: "",
        "capacity-low": "Capacity: Low → High",
        "capacity-high": "Capacity: High → Low",
        "name-az": "Name: A → Z",
      };
      if (sortLabels[state.sort]) pills.push({ key: "sort", label: sortLabels[state.sort] });
    }
    return pills;
  }, [state]);

  const removeFilterByKey = useCallback((key: string) => {
    setState((s) => {
      if (key === "building") return { ...s, building: "" };
      if (key === "streaming") return { ...s, streamingOnly: false };
      if (key === "electronic") return { ...s, electronicOnly: false };
      if (key === "doccam") return { ...s, docCamOnly: false };
      if (key === "sort") return { ...s, sort: "recommended" };
      if (key.startsWith("capacity-")) {
        const bucket = key.replace("capacity-", "") as CapacityBucket;
        return {
          ...s,
          capacityBuckets: s.capacityBuckets.filter((b) => b !== bucket),
        };
      }
      if (key.startsWith("furniture-")) {
        const label = key.replace("furniture-", "");
        return {
          ...s,
          furnitureSelected: s.furnitureSelected.filter((f) => f !== label),
        };
      }
      return s;
    });
  }, []);

  return {
    state,
    setSearch,
    setBuilding,
    toggleCapacityBucket,
    setStreamingOnly,
    setElectronicOnly,
    setDocCamOnly,
    setFurnitureSelected: (labels: string[]) => setState((s) => ({ ...s, furnitureSelected: labels })),
    toggleFurniture,
    setSort,
    hasActiveFilters,
    resetFilters,
    removeFilterByKey,
    buildingModalOpen,
    setBuildingModalOpen,
    buildingsList,
    activeFilterPills,
  };
}

function sortRooms(rooms: Room[], sort: SortOption): Room[] {
  const copy = [...rooms];
  switch (sort) {
    case "recommended":
      return copy.sort((a, b) => {
        const buildingCmp = (a.building || "").localeCompare(b.building || "");
        if (buildingCmp !== 0) return buildingCmp;
        const aNum = a.roomNumber ?? a.name;
        const bNum = b.roomNumber ?? b.name;
        return String(aNum).localeCompare(String(bNum), undefined, { numeric: true });
      });
    case "capacity-low":
      return copy.sort((a, b) => a.capacity - b.capacity);
    case "capacity-high":
      return copy.sort((a, b) => b.capacity - a.capacity);
    case "name-az":
      return copy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    default:
      return copy;
  }
}

export function filterAndSortRooms(rooms: Room[], state: RoomsFilterState): Room[] {
  const q = state.search.trim().toLowerCase();
  const furnitureSet = new Set(state.furnitureSelected);
  const capacityBuckets = state.capacityBuckets;
  let filtered = rooms.filter((room) => {
    if (state.building && room.building !== state.building) return false;
    if (capacityBuckets.length > 0) {
      const inAny = capacityBuckets.some((b) => roomInCapacityBucket(room, b));
      if (!inAny) return false;
    }
    if (state.streamingOnly && !roomIsStreamingRecordingCapable(room)) return false;
    if (state.electronicOnly && !roomIsElectronicClassroom(room)) return false;
    if (state.docCamOnly && !roomHasDocumentCamera(room)) return false;
    if (furnitureSet.size > 0) {
      const roomLabels = new Set(furnitureLabelsFromCodes(room.furniture));
      for (const need of furnitureSet) {
        if (!roomLabels.has(need)) return false;
      }
    }
    if (q) {
      const name = (room.name || "").toLowerCase();
      const building = (room.building || "").toLowerCase();
      if (!name.includes(q) && !building.includes(q)) return false;
    }
    return true;
  });
  return sortRooms(filtered, state.sort);
}

interface RoomsFiltersProps {
  state: RoomsFilterState;
  setSearch: (v: string) => void;
  setBuilding: (v: string) => void;
  toggleCapacityBucket: (b: CapacityBucket) => void;
  setStreamingOnly: (v: boolean) => void;
  setElectronicOnly: (v: boolean) => void;
  setDocCamOnly: (v: boolean) => void;
  toggleFurniture: (label: string) => void;
  setSort: (v: SortOption) => void;
  buildingModalOpen: boolean;
  setBuildingModalOpen: (v: boolean) => void;
  buildingsList: { value: string; label: string }[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

function FilterCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <motion.label
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--border)]/30"
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={label}
        />
        <motion.span
          className="pointer-events-none absolute inset-0 rounded border bg-[var(--surface)]"
          animate={{
            borderColor: checked ? "var(--primary)" : "var(--border)",
            backgroundColor: checked ? "var(--primarySubtle)" : "var(--surface)",
          }}
          transition={{ duration: 0.2 }}
        />
        <AnimatePresence initial={false}>
          {checked && (
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative z-10 h-3 w-3"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path d="M5 12l5 5L20 7" />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      <span className="text-sm text-[var(--textSecondary)]">{label}</span>
    </motion.label>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--text)] transition hover:bg-[var(--border)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] focus:ring-inset"
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--textMuted)]"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] px-2 pb-2 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CAPACITY_BUCKET_OPTIONS: { value: CapacityBucket; label: string }[] = [
  { value: "small", label: "Small (0–50)" },
  { value: "medium", label: "Medium (51–150)" },
  { value: "large", label: "Large (151+)" },
];

export function RoomsFilters({
  state,
  setSearch,
  setBuilding,
  toggleCapacityBucket,
  setStreamingOnly,
  setElectronicOnly,
  setDocCamOnly,
  toggleFurniture,
  setSort,
  buildingModalOpen,
  setBuildingModalOpen,
  buildingsList,
  hasActiveFilters,
  onReset,
}: RoomsFiltersProps) {
  const [avOpen, setAvOpen] = useState(false);
  const [furnitureOpen, setFurnitureOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);

  const buildingLabel = useMemo(
    () => buildingsList.find((b) => b.value === state.building)?.label ?? "Any building",
    [state.building, buildingsList]
  );

  return (
    <>
      <div className="space-y-4">
        {/* Building selector */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
            Building
          </p>
          <button
            type="button"
            onClick={() => setBuildingModalOpen(true)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surfaceElevated)] px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          >
            {buildingLabel}
          </button>
        </div>

        {/* Filter sections */}
        <div className="grid gap-3 sm:grid-cols-2">
          <CollapsibleSection
            title="Capacity"
            open={capacityOpen}
            onToggle={() => setCapacityOpen((o) => !o)}
          >
            {CAPACITY_BUCKET_OPTIONS.map((opt) => (
              <FilterCheckbox
                key={opt.value}
                checked={state.capacityBuckets.includes(opt.value)}
                onChange={() => toggleCapacityBucket(opt.value)}
                label={opt.label}
              />
            ))}
          </CollapsibleSection>
          <CollapsibleSection
            title="AV Capabilities"
            open={avOpen}
            onToggle={() => setAvOpen((o) => !o)}
          >
            <FilterCheckbox
              checked={state.streamingOnly}
              onChange={setStreamingOnly}
              label="Streaming & Recording"
            />
            <FilterCheckbox
              checked={state.electronicOnly}
              onChange={setElectronicOnly}
              label="Electronic Classroom"
            />
            <FilterCheckbox
              checked={state.docCamOnly}
              onChange={setDocCamOnly}
              label="Document Camera"
            />
          </CollapsibleSection>
          <CollapsibleSection
            title="Furniture Layout"
            open={furnitureOpen}
            onToggle={() => setFurnitureOpen((o) => !o)}
          >
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {FURNITURE_OPTIONS.map((label) => (
                <FilterCheckbox
                  key={label}
                  checked={state.furnitureSelected.includes(label)}
                  onChange={() => toggleFurniture(label)}
                  label={label}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <BuildingModal
        isOpen={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        value={state.building}
        onSelect={(v) => {
          setBuilding(v);
          setBuildingModalOpen(false);
        }}
        buildings={buildingsList}
      />
    </>
  );
}
