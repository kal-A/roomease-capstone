"use client";

/**
 * Demo: building closures and room/time blocking for facility management.
 * Stored in localStorage; replace with API later.
 */

const STORAGE_KEY = "roomease.blocking.v1";

export interface BlockedSlot {
  id: string;
  type: "building" | "room" | "timeRange";
  /** Building code (for building closure or time range) */
  building?: string;
  /** Room ID (for room block or time range) */
  roomId?: string;
  /** YYYY-MM-DD (for time range) */
  date?: string;
  /** Start minutes from midnight (for time range) */
  startMin?: number;
  /** End minutes from midnight (for time range) */
  endMin?: number;
  reason?: string;
  createdAt: string;
}

function load(): BlockedSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(slots: BlockedSlot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // ignore
  }
}

let idSeq = 1;
function nextId() {
  return `block-${Date.now()}-${idSeq++}`;
}

export function getBlockedSlots(): BlockedSlot[] {
  return load();
}

/** Get fake "bookings" for a room/date so TimeBar can show them as blocked */
export function getBlockedAsBookings(
  roomId: string | number,
  date: string,
  building?: string
): {
  roomId: string;
  preferredDate: string;
  timeSlot: string;
  durationMinutes: number;
  organizerEmail?: string;
  organizerName?: string;
}[] {
  const slots = load();
  const roomIdStr = String(roomId);
  const result: {
    roomId: string;
    preferredDate: string;
    timeSlot: string;
    durationMinutes: number;
    organizerEmail?: string;
    organizerName?: string;
  }[] = [];

  for (const s of slots) {
    if (s.type === "building" && s.building && building && String(building) === s.building) {
      if (s.date === date && s.startMin != null && s.endMin != null) {
        const h = Math.floor(s.startMin / 60);
        const m = s.startMin % 60;
        const dur = (s.endMin ?? s.startMin) - s.startMin;
        result.push({
          roomId: roomIdStr,
          preferredDate: date,
          timeSlot: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          durationMinutes: dur,
        });
      }
    }
    if (s.type === "room" && s.roomId === roomIdStr) {
      if (s.date === date && s.startMin != null && s.endMin != null) {
        const h = Math.floor(s.startMin / 60);
        const m = s.startMin % 60;
        const dur = (s.endMin ?? s.startMin) - s.startMin;
        result.push({
          roomId: roomIdStr,
          preferredDate: date,
          timeSlot: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          durationMinutes: dur,
        });
      }
    }
    if (s.type === "timeRange" && (s.roomId === roomIdStr || (s.building && building && String(building) === s.building)) && s.date === date && s.startMin != null && s.endMin != null) {
      const h = Math.floor(s.startMin / 60);
      const m = s.startMin % 60;
      const dur = s.endMin - s.startMin;
      result.push({
        roomId: roomIdStr,
        preferredDate: date,
        timeSlot: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        durationMinutes: dur,
      });
    }
  }
  return result;
}

const DAY_START = 9 * 60;
const DAY_END = 22 * 60;

/** Close a building for a full day (9 AM–10 PM) */
export function closeBuilding(buildingCode: string, date: string, reason?: string): BlockedSlot {
  const slot: BlockedSlot = {
    id: nextId(),
    type: "timeRange",
    building: buildingCode,
    date,
    startMin: DAY_START,
    endMin: DAY_END,
    reason: reason ?? "Building closed for maintenance",
    createdAt: new Date().toISOString(),
  };
  save([...load(), slot]);
  return slot;
}

/** Block a room for a time range (or full day if start/end omitted) */
export function blockRoom(roomId: string, date: string, startMin?: number, endMin?: number, reason?: string): BlockedSlot {
  const slot: BlockedSlot = {
    id: nextId(),
    type: "timeRange",
    roomId,
    date,
    startMin: startMin ?? DAY_START,
    endMin: endMin ?? DAY_END,
    reason: reason ?? "Room blocked",
    createdAt: new Date().toISOString(),
  };
  save([...load(), slot]);
  return slot;
}

export function blockTimeRange(
  opts: { building?: string; roomId?: string; date: string; startMin: number; endMin: number; reason?: string }
): BlockedSlot {
  const slot: BlockedSlot = {
    id: nextId(),
    type: "timeRange",
    building: opts.building,
    roomId: opts.roomId,
    date: opts.date,
    startMin: opts.startMin,
    endMin: opts.endMin,
    reason: opts.reason ?? "Blocked",
    createdAt: new Date().toISOString(),
  };
  save([...load(), slot]);
  return slot;
}

export function removeBlock(id: string): void {
  save(load().filter((s) => s.id !== id));
}
