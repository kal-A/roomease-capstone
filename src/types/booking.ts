/** Room from rooms.json; may have extra keys */
export interface Room {
  id: number | string;
  name: string;
  building: string;
  roomNumber?: string;
  capacity: number;
  furniture?: string;
  avCapable: boolean;
  docCamera?: boolean;
  rawFeatureCode?: string;
  accessible: boolean;
  /** @deprecated use avCapable */
  hasAV?: boolean;
  [key: string]: unknown;
}

/** AV options shown to users (no codes). */
export type AvNeedKey =
  | "streamingRecording"
  | "electronicClassroom"
  | "documentCamera"
  | "none";

export interface EventFormData {
  eventName: string;
  organizerName: string;
  preferredDate: string;
  timeSlot: string;
  groupSize: number;
  eventType: string;
  eventTypeCustom?: string;
  durationMinutes: number;
  /** Toggle "I need AV / equipment" - does NOT hard-filter by itself */
  avNeedsEnabled: boolean;
  /** Selected AV needs; empty or ["none"] = no preference */
  avNeeds: AvNeedKey[];
  avNotes?: string;
  /** Toggle "I have specific furniture needs" */
  furnitureNeedsEnabled: boolean;
  /** Selected furniture labels; empty = no preference */
  furnitureNeeds: string[];
  preferredBuilding?: string;
  priorityLevel?: string;
  /** Optional participant emails (invitees); demo only, no real email */
  participantEmails?: string[];
}

export interface BookedSlot {
  roomId: number | string;
  roomName: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
}

/** 30-min slots from 9:00 AM to 10:00 PM. value = "09:00" .. "22:00" (HH:MM 24h) */
export const TIME_SLOTS_30MIN: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 9; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;
      out.push({ value, label });
    }
  }
  return out;
})();

export const DURATION_PRESETS = [
  { value: 30, label: "30m" },
  { value: 60, label: "1h" },
  { value: 90, label: "1.5h" },
  { value: 120, label: "2h" },
  { value: 180, label: "3h" },
] as const;

export const DURATION_CUSTOM_MIN = 30;
export const DURATION_CUSTOM_MAX = 6 * 60;

/** AV need options for "What do you need?" chip list */
export const AV_NEED_OPTIONS: { value: AvNeedKey; label: string }[] = [
  { value: "streamingRecording", label: "Streaming & Recording Ready" },
  { value: "electronicClassroom", label: "Electronic Classroom" },
  { value: "documentCamera", label: "Document Camera Available" },
  { value: "none", label: "No preference" },
];

export const EVENT_TYPES = [
  { value: "Study Session", label: "Study Session" },
  { value: "Interview", label: "Interview" },
  { value: "Workshop", label: "Workshop" },
  { value: "Tutorial / Review", label: "Tutorial / Review" },
  { value: "Club Meeting", label: "Club Meeting" },
  { value: "Team Meeting", label: "Team Meeting" },
  { value: "Presentation", label: "Presentation" },
  { value: "Social / Networking", label: "Social / Networking" },
  { value: "Other", label: "Other" },
] as const;

export const PRIORITY_LEVELS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
] as const;

export function formatTimeSlot(value: string): string {
  const found = TIME_SLOTS_30MIN.find((s) => s.value === value);
  return found ? found.label : value;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function timeRangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number
): boolean {
  const endA = startA + durationA;
  const endB = startB + durationB;
  return startA < endB && startB < endA;
}

/** Room is AV-capable (SR) for matching */
export function roomAvCapable(room: Room): boolean {
  return room.avCapable === true || room.hasAV === true;
}

export function roomHasDocumentCamera(room: Room): boolean {
  return room.docCamera === true;
}

export function roomIsStreamingRecordingCapable(room: Room): boolean {
  // Dataset encodes SR in rawFeatureCode; do not show codes in UI.
  const raw = String(room.rawFeatureCode ?? "").toUpperCase();
  return raw.includes("SR");
}

export function roomIsElectronicClassroom(room: Room): boolean {
  // Dataset does not distinguish; treat AV-capable rooms as electronic classroom for now.
  return roomAvCapable(room);
}
