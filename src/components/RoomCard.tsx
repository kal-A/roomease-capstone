"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { furnitureLabelsFromCodes } from "@/lib/furniture";
import { AVAndFurnitureSections } from "@/components/AVAndFurnitureSections";
import { useCompare } from "@/lib/compareStore";
import type { AvNeedKey } from "@/types/booking";
import type { Room } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { getBuildingTicketLabel } from "@/lib/buildings";

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
      className={`relative rounded-xl border-2 bg-[#1A1A1A] p-6 shadow-xl ${
        isBestMatch ? "border-[#FFD100]/60" : "border-[#2A2A2A] hover:border-[#FFD100]/40"
      }`}
      initial={false}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 20px 40px -12px rgba(255, 209, 0, 0.12)",
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-gray-300 opacity-0 transition hover:bg-[#222] hover:text-white focus:bg-[#222] focus:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-2 focus:ring-offset-[#1A1A1A] group-hover:opacity-100"
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
              className="absolute right-0 mt-2 w-44 rounded-lg border border-[#2A2A2A] bg-[#111111] py-1 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  toggleCompare(room.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#1f1f1f]"
              >
                {inCompare ? "Remove from compare" : "Add to compare"}
              </button>
            </div>
          )}
        </div>
      </div>
      {isBestMatch && (
        <div className="mb-4 inline-flex rounded-full bg-[#FFD100]/20 px-3 py-1 text-sm font-semibold text-[#FFD100]">
          Best Match
        </div>
      )}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">{room.name}</h2>
        <p className="mt-1 text-gray-400">{getBuildingTicketLabel(room.building)}</p>
      </div>
      <p className="mb-3 text-gray-400">
        Capacity: <span className="text-white font-medium">{room.capacity}</span>
      </p>
      <div className="mb-4 space-y-3">
        <AVAndFurnitureSections room={room} animatedBadges />
      </div>
      <div className="mb-6 rounded-lg border border-[#2A2A2A] bg-[#111111] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Why this room</p>
        <ul className="space-y-1 text-sm text-gray-300">
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
          className="flex-1 rounded-xl bg-[#FFD100] px-4 py-3 font-semibold text-black shadow-lg transition hover:bg-[#e6bc00] focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
        >
          Book this room
        </button>
        <button
          type="button"
          onClick={onViewDetails}
          className="rounded-xl border border-[#2A2A2A] bg-transparent px-4 py-3 font-medium text-gray-400 transition hover:border-[#FFD100]/50 hover:text-[#FFD100] focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
        >
          View details
        </button>
      </div>
    </motion.div>
  );
}
