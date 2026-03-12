"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { furnitureLabelsFromCodes } from "@/lib/furniture";
import { AVAndFurnitureSections } from "@/components/AVAndFurnitureSections";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { useCompare } from "@/lib/compareStore";
import type { AvNeedKey } from "@/types/booking";
import type { Room } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { getBuildingTicketLabel } from "@/lib/buildings";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";

interface RoomCardProps {
  room: Room;
  groupSize: number;
  avNeedsEnabled: boolean;
  avNeeds: AvNeedKey[];
  furnitureNeedsEnabled: boolean;
  furnitureNeeds: string[];
  onSelect: () => void;
  onViewDetails: () => void;
  isBestMatch?: boolean;
}

export function RoomCard({
  room,
  groupSize,
  avNeedsEnabled,
  avNeeds,
  furnitureNeedsEnabled,
  furnitureNeeds,
  onSelect,
  onViewDetails,
  isBestMatch = false,
}: RoomCardProps) {
  const fitsGroup = room.capacity >= groupSize;
  const hasStreaming = roomIsStreamingRecordingCapable(room);
  const hasElectronic = roomIsElectronicClassroom(room);
  const hasDocCamera = roomHasDocumentCamera(room);

  const needsStreaming = avNeeds.includes("streamingRecording");
  const needsElectronic = avNeeds.includes("electronicClassroom");
  const needsDocCamera = avNeeds.includes("documentCamera");

  const meetsStreaming = !avNeedsEnabled || !needsStreaming || hasStreaming;
  const meetsElectronic = !avNeedsEnabled || !needsElectronic || hasElectronic;
  const meetsDocCam = !avNeedsEnabled || !needsDocCamera || hasDocCamera;

  const meetsFurniture =
    !furnitureNeedsEnabled ||
    (furnitureNeeds?.length ?? 0) === 0 ||
    (() => {
      const labels = furnitureLabelsFromCodes(room.furniture);
      return furnitureNeeds.every((need) => labels.includes(need));
    })();

  const { isInCompare, toggleCompare } = useCompare();
  const inCompare = isInCompare(room.id);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      className={`card-elevated relative p-6 ${
        isBestMatch ? "border-[var(--primary)]/50" : ""
      }`}
      style={{ borderRadius: "var(--radiusLg)", borderWidth: isBestMatch ? "2px" : "1px" }}
      initial={false}
      whileHover={{
        scale: 1.01,
        transition: { duration: 0.2 },
      }}
      transition={{ duration: 0.2 }}
      onClick={() => {
        if (menuOpen) setMenuOpen(false);
      }}
    >
      {/* Actions menu trigger (three-dot menu) */}
      <div className="absolute right-4 top-4 z-20">
        <div className="relative group">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surfaceElevated)] border border-[var(--border)] text-[var(--icon)] opacity-0 transition hover:bg-[var(--border)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] group-hover:opacity-100"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <circle cx="4" cy="10" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="16" cy="10" r="1.5" />
            </svg>
            <span className="sr-only">Open room actions</span>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-lg border border-[var(--border)] bg-[var(--surfaceElevated)] py-1 shadow-[var(--shadowLg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  toggleCompare(room.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--border)]/50"
              >
                {inCompare ? "Remove from compare" : "Add to compare"}
              </button>
            </div>
          )}
        </div>
      </div>
      {isBestMatch && (
        <div className="mb-4 inline-flex rounded-full bg-[var(--primary)]/12 border border-[var(--primary)]/30 px-3 py-1 text-sm font-semibold text-[var(--primary)]">
          Best Match
        </div>
      )}
      {getRoomMetadataWithDefaults(room.id).approvalRequired && (
        <div className="mb-4">
          <ApprovalBadge variant="required" />
        </div>
      )}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[var(--text)]">{room.name}</h2>
        <p className="mt-1 text-[var(--textSecondary)]">{getBuildingTicketLabel(room.building)}</p>
      </div>
      <p className="mb-3 text-[var(--textSecondary)]">
        Capacity: <span className="text-[var(--text)] font-medium">{room.capacity}</span>
      </p>
      <div className="mb-4 space-y-3">
        <AVAndFurnitureSections room={room} animatedBadges />
      </div>
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Why this room</p>
        <ul className="space-y-1 text-sm text-[var(--textSecondary)]">
          <li>• Fits your group size</li>
          {avNeedsEnabled && needsStreaming && <li>• {meetsStreaming ? "Streaming & recording ready" : "Streaming & recording not available"}</li>}
          {avNeedsEnabled && needsElectronic && <li>• {meetsElectronic ? "Electronic classroom" : "Electronic classroom not available"}</li>}
          {avNeedsEnabled && needsDocCamera && <li>• {meetsDocCam ? "Document camera available" : "Document camera not available"}</li>}
          {furnitureNeedsEnabled && (furnitureNeeds?.length ?? 0) > 0 && (
            <li>• {meetsFurniture ? "Matches your furniture requirements" : "Does not match furniture requirements"}</li>
          )}
        </ul>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold shadow-md transition hover:bg-[var(--primaryHover)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
        >
          Book this room
        </button>
        <button
          type="button"
          onClick={onViewDetails}
          className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 font-medium text-[var(--textSecondary)] transition hover:border-[var(--primary)]/50 hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
        >
          View details
        </button>
      </div>
    </motion.div>
  );
}
