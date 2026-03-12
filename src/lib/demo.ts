/**
 * Demo mode and demo-only helpers for capstone presentation.
 * When NEXT_PUBLIC_DEMO_MODE=true, use mock data and simulated intelligence.
 * Structure is ready for real backend integration later.
 */

export const isDemoMode = (): boolean =>
  typeof process !== "undefined" &&
  process.env?.NEXT_PUBLIC_DEMO_MODE === "true";

/** Context used to compute match score (optional; when from booking flow or filters) */
export interface MatchContext {
  groupSize?: number;
  preferredBuilding?: string;
  avNeeds?: string[];
  furnitureNeeds?: string[];
  /** For "exact time available" we need date + timeSlot + durationMinutes */
  date?: string;
  timeSlot?: string;
  durationMinutes?: number;
  existingBookings?: { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number }[];
}

export type MatchReason =
  | "Exact time available"
  | "Fits group size"
  | "AV match"
  | "Furniture match"
  | "Preferred building";

export interface MatchResult {
  score: number;
  reasons: MatchReason[];
}

/** Room-like minimal type for scoring */
interface RoomForMatch {
  id: number | string;
  capacity: number;
  building?: string;
  avCapable?: boolean;
  docCamera?: boolean;
  rawFeatureCode?: string;
  furniture?: string;
  [key: string]: unknown;
}

function roomHasStreaming(room: RoomForMatch): boolean {
  const raw = String(room.rawFeatureCode ?? "").toUpperCase();
  return raw.includes("SR");
}

function roomHasDocCamera(room: RoomForMatch): boolean {
  return room.docCamera === true;
}

function roomHasElectronic(room: RoomForMatch): boolean {
  return room.avCapable === true || (room as { hasAV?: boolean }).hasAV === true;
}

/** Simulated match score and reasons for demo. Replace with real recommendation API later. */
export function getMatchScore(
  room: RoomForMatch,
  context?: MatchContext
): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;
  const maxScore = 100;

  // Capacity fit (up to ~25 points)
  const groupSize = context?.groupSize ?? 0;
  if (groupSize > 0 && room.capacity >= groupSize) {
    reasons.push("Fits group size");
    const headroom = room.capacity - groupSize;
    score += headroom <= 10 ? 25 : headroom <= 50 ? 22 : 18;
  } else if (groupSize === 0) {
    score += 15; // no preference
  }

  // AV match (up to ~25 points) — check context avNeeds vs room
  const avNeeds = context?.avNeeds ?? [];
  const needsStreaming = avNeeds.some((n) => n.toLowerCase().includes("streaming") || n === "streamingRecording");
  const needsElectronic = avNeeds.some((n) => n.toLowerCase().includes("electronic") || n === "electronicClassroom");
  const needsDocCam = avNeeds.some((n) => n.toLowerCase().includes("document") || n === "documentCamera");
  if (avNeeds.length === 0 || (avNeeds.length === 1 && avNeeds[0] === "none")) {
    score += 20;
  } else {
    let avMatch = false;
    if (needsStreaming && roomHasStreaming(room)) avMatch = true;
    if (needsElectronic && roomHasElectronic(room)) avMatch = true;
    if (needsDocCam && roomHasDocCamera(room)) avMatch = true;
    if (avMatch || (room.avCapable && !needsStreaming && !needsDocCam)) {
      reasons.push("AV match");
      score += 25;
    } else {
      score += 5;
    }
  }

  // Furniture match (up to ~20 points) — simplified: if room has furniture and user selected something, check overlap
  const furnitureNeeds = context?.furnitureNeeds ?? [];
  if (furnitureNeeds.length === 0) {
    score += 18;
  } else if (room.furniture) {
    reasons.push("Furniture match");
    score += 20;
  } else {
    score += 8;
  }

  // Preferred building (~15 points)
  const prefBuilding = (context?.preferredBuilding ?? "").trim();
  if (prefBuilding && String(room.building || "").toLowerCase() === prefBuilding.toLowerCase()) {
    reasons.push("Preferred building");
    score += 15;
  } else if (!prefBuilding) {
    score += 12;
  } else {
    score += 5;
  }

  // Exact time available (~15 points) — need to check existingBookings for this room/date
  const date = context?.date;
  const timeSlot = context?.timeSlot;
  const durationMinutes = context?.durationMinutes ?? 60;
  const existingBookings = context?.existingBookings ?? [];
  if (date && timeSlot && durationMinutes > 0) {
    const roomId = String(room.id);
    const roomBookings = existingBookings.filter(
      (b) => b.preferredDate === date && String(b.roomId) === roomId
    );
    const slotStart = timeSlot.includes(":") ? (() => {
      const [h, m] = timeSlot.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    })() : 0;
    const slotEnd = slotStart + durationMinutes;
    const hasConflict = roomBookings.some((b) => {
      const bStart = b.timeSlot.includes(":") ? (() => {
        const [h, m] = b.timeSlot.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      })() : 0;
      const bEnd = bStart + (b.durationMinutes ?? 60);
      return slotStart < bEnd && slotEnd > bStart;
    });
    if (!hasConflict) {
      reasons.push("Exact time available");
      score += 15;
    } else {
      score += 3;
    }
  } else {
    score += 10;
  }

  const clamped = Math.min(maxScore, Math.round(score));
  return {
    score: clamped,
    reasons: reasons.length > 0 ? reasons : (["Fits group size", "Furniture match"] as MatchReason[]),
  };
}
