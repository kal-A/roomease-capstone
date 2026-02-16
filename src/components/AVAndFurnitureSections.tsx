"use client";

import { furnitureLabelsFromCodes } from "@/lib/furniture";
import type { Room } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { FeatureBadge } from "./FeatureBadge";

interface AVAndFurnitureSectionsProps {
  room: Room;
  /** Same badge style; set false in modals/tight spaces to avoid double animation */
  animatedBadges?: boolean;
  /** Compact spacing (e.g. quick-view panel) */
  compact?: boolean;
  /** Optional cap on furniture badges, e.g. in tight hover overlays */
  maxFurnitureBadges?: number;
}

export function AVAndFurnitureSections({
  room,
  animatedBadges = true,
  compact = false,
  maxFurnitureBadges,
}: AVAndFurnitureSectionsProps) {
  const hasStreaming = roomIsStreamingRecordingCapable(room);
  const hasElectronic = roomIsElectronicClassroom(room);
  const hasDocCamera = roomHasDocumentCamera(room);
  const furnitureLabels = furnitureLabelsFromCodes(room.furniture).filter((l) => l !== "(Unknown)");

  const { displayFurnitureLabels, extraFurnitureCount } = (() => {
    if (!maxFurnitureBadges || furnitureLabels.length <= maxFurnitureBadges) {
      return { displayFurnitureLabels: furnitureLabels, extraFurnitureCount: 0 };
    }
    return {
      displayFurnitureLabels: furnitureLabels.slice(0, maxFurnitureBadges),
      extraFurnitureCount: furnitureLabels.length - maxFurnitureBadges,
    };
  })();

  const headingClass = compact
    ? "mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]"
    : "mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]";
  const gapClass = compact ? "gap-1.5" : "gap-2";

  return (
    <>
      <div>
        <p className={headingClass}>AV Capabilities</p>
        <div className={`flex flex-wrap ${gapClass}`}>
          {hasStreaming && (
            <FeatureBadge animated={animatedBadges}>Streaming & Recording</FeatureBadge>
          )}
          {hasElectronic && (
            <FeatureBadge animated={animatedBadges}>Electronic Classroom</FeatureBadge>
          )}
          {hasDocCamera && (
            <FeatureBadge animated={animatedBadges}>Document Camera</FeatureBadge>
          )}
          {!hasStreaming && !hasElectronic && !hasDocCamera && (
            <span className="text-xs text-[var(--textMuted)]">None listed</span>
          )}
        </div>
      </div>
      <div>
        <p className={headingClass}>Furniture Layout</p>
        <div className={`flex flex-wrap ${gapClass}`}>
          {furnitureLabels.length > 0 ? (
            <>
              {displayFurnitureLabels.map((label) => (
                <FeatureBadge key={label} animated={animatedBadges}>
                  {label}
                </FeatureBadge>
              ))}
              {extraFurnitureCount > 0 && (
                <FeatureBadge animated={animatedBadges}>+{extraFurnitureCount}</FeatureBadge>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">Not specified</span>
          )}
        </div>
      </div>
    </>
  );
}
