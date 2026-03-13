import type { Booking } from "@/lib/bookingsStore";
import { timeToMinutes } from "@/types/booking";

export type ClubKey = string;

export interface TopCountEntry {
  key: string;
  label: string;
  count: number;
}

export interface RoomClubEntry {
  roomId: string;
  roomName: string;
  building: string;
  topClubs: TopCountEntry[];
}

export function normalizeOrganizer(raw: string | undefined | null): { key: ClubKey; label: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { key: "unknown", label: "Unknown Organizer" };
  const key = trimmed.toLowerCase();
  return { key, label: trimmed };
}

export function normalizeBuilding(raw: string | undefined | null): string {
  return (raw ?? "").trim();
}

export function getScopedBookings(
  bookings: Booking[],
  scope: "global" | "user",
  userEmail?: string | null
): Booking[] {
  if (scope === "global") return bookings;
  const email = (userEmail ?? "").trim().toLowerCase();
  if (!email) return [];
  return bookings.filter((b) => (b.organizerEmail ?? "").trim().toLowerCase() === email);
}

export function getTopClubs(bookings: Booking[], limit = 10): TopCountEntry[] {
  const counts = new Map<ClubKey, { label: string; count: number }>();
  for (const b of bookings) {
    const { key, label } = normalizeOrganizer(b.organizerName);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopRooms(bookings: Booking[], limit = 10): TopCountEntry[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const b of bookings) {
    const key = String(b.roomId);
    const label = b.roomName;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopBuildings(bookings: Booking[], limit = 10): TopCountEntry[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const code = normalizeBuilding(b.building);
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopClubsPerRoom(bookings: Booking[], perRoomLimit = 3): RoomClubEntry[] {
  const byRoom = new Map<
    string,
    { roomName: string; building: string; clubCounts: Map<ClubKey, { label: string; count: number }> }
  >();

  for (const b of bookings) {
    const roomKey = String(b.roomId);
    const roomName = b.roomName;
    const building = normalizeBuilding(b.building);
    const { key: clubKey, label: clubLabel } = normalizeOrganizer(b.organizerName);

    let roomEntry = byRoom.get(roomKey);
    if (!roomEntry) {
      roomEntry = {
        roomName,
        building,
        clubCounts: new Map(),
      };
      byRoom.set(roomKey, roomEntry);
    }
    const existingClub = roomEntry.clubCounts.get(clubKey);
    if (existingClub) {
      existingClub.count += 1;
    } else {
      roomEntry.clubCounts.set(clubKey, { label: clubLabel, count: 1 });
    }
  }

  const result: RoomClubEntry[] = [];
  for (const [roomId, { roomName, building, clubCounts }] of byRoom.entries()) {
    const sortedClubs = Array.from(clubCounts.entries())
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, perRoomLimit);
    result.push({ roomId, roomName, building, topClubs: sortedClubs });
  }

  // Sort rooms by total bookings (sum of their top clubs)
  result.sort((a, b) => {
    const aTotal = a.topClubs.reduce((sum, c) => sum + c.count, 0);
    const bTotal = b.topClubs.reduce((sum, c) => sum + c.count, 0);
    return bTotal - aTotal;
  });
  return result;
}

export function getBuildingsByClub(bookings: Booking[], clubKey: ClubKey): TopCountEntry[] {
  const counts = new Map<string, number>();
  const normalizedKey = clubKey.toLowerCase();
  for (const b of bookings) {
    const { key } = normalizeOrganizer(b.organizerName);
    if (key !== normalizedKey) continue;
    const building = normalizeBuilding(b.building);
    if (!building) continue;
    counts.set(building, (counts.get(building) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTrendsByClub(bookings: Booking[], clubKey?: ClubKey): { date: string; bookings: number }[] {
  const byDay = new Map<string, number>();
  const target = clubKey ? clubKey.toLowerCase() : null;

  for (const b of bookings) {
    if (target) {
      const { key } = normalizeOrganizer(b.organizerName);
      if (key !== target) continue;
    }
    const day = b.preferredDate;
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, count]) => ({ date, bookings: count }));
}

export function getPeakHours(bookings: Booking[]): { hour: string; label: string; bookings: number }[] {
  const byHour = new Map<number, number>();
  for (const b of bookings) {
    const [hStr] = (b.timeSlot || "09:00").split(":");
    const h = Number(hStr) || 9;
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
  }
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  return hours.map((h) => {
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      label: `${h12} ${ampm}`,
      bookings: byHour.get(h) ?? 0,
    };
  });
}

export function getTopTimeSlots(bookings: Booking[], limit = 5): TopCountEntry[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const slot = b.timeSlot || "";
    if (!slot) continue;
    counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

