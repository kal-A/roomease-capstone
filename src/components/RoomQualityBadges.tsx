"use client";

import { motion } from "framer-motion";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";

interface RoomQualityBadgesProps {
  roomId: string | number;
  className?: string;
}

const BADGE_COLORS: Record<string, string> = {
  high: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  medium: "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30",
  low: "bg-[var(--textMuted)]/20 text-[var(--textMuted)] border-[var(--border)]",
  full: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  partial: "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30",
  none: "bg-[var(--textMuted)]/20 text-[var(--textMuted)] border-[var(--border)]",
};

function Badge({ label, value }: { label: string; value: string }) {
  const color = BADGE_COLORS[value] ?? BADGE_COLORS.medium;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {label}: {value}
    </motion.span>
  );
}

export function RoomQualityBadges({ roomId, className = "" }: RoomQualityBadgesProps) {
  const meta = getRoomMetadataWithDefaults(roomId);
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Badge label="Lighting" value={meta.lightingQuality ?? "medium"} />
      <Badge label="Noise" value={meta.noiseLevel ?? "medium"} />
      <Badge label="Accessibility" value={meta.accessibility ?? "full"} />
      <Badge label="Equipment" value={meta.equipmentReliability ?? "medium"} />
    </div>
  );
}
