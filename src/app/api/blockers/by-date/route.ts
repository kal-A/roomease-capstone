import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLocalDayBoundsUtc } from "@/lib/bookingTime";
import { ROOMS } from "@/data/rooms";
import { DateTime } from "luxon";

type BlockedByDateBooking = {
  roomId: string;
  preferredDate: string;
  timeSlot: string; // HH:mm local
  durationMinutes: number;
  organizerName?: string;
  organizerEmail?: string;
};

function toTimeSlotAndDuration(startLocal: DateTime, endLocal: DateTime): { timeSlot: string; durationMinutes: number } {
  const startMillis = startLocal.toMillis();
  const endMillis = endLocal.toMillis();
  const durMin = Math.max(0, Math.round((endMillis - startMillis) / 60000));
  return { timeSlot: startLocal.toFormat("HH:mm"), durationMinutes: Math.max(1, durMin) };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  let dayStartUtc: string;
  let dayEndUtc: string;
  try {
    const bounds = buildLocalDayBoundsUtc(date);
    dayStartUtc = bounds.dayStartUtcIso;
    dayEndUtc = bounds.dayEndUtcIso;
  } catch {
    return NextResponse.json({ error: "Invalid date; expected YYYY-MM-DD" }, { status: 400 });
  }

  // Convert bounds back to local for clipping.
  const localDayStart = DateTime.fromISO(dayStartUtc).setZone("America/Toronto");
  const localDayEnd = DateTime.fromISO(dayEndUtc).setZone("America/Toronto");

  const sb = supabaseServer();
  const { data: blockers, error } = await sb
    .from("room_blockers")
    .select("id,room_id,building,start_time,end_time,reason")
    .eq("is_active", true)
    .lt("start_time", dayEndUtc)
    .gt("end_time", dayStartUtc);

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code ?? undefined }, { status: 500 });
  }

  const roomsByBuilding = new Map<string, string[]>();
  for (const r of ROOMS) {
    const b = String(r.building ?? "").trim();
    if (!b) continue;
    const arr = roomsByBuilding.get(b) ?? [];
    arr.push(String(r.id));
    roomsByBuilding.set(b, arr);
  }

  const blockedBookings: BlockedByDateBooking[] = [];
  for (const b of blockers ?? []) {
    const roomId = b.room_id ? String(b.room_id) : null;
    const building = b.building ? String(b.building) : null;
    const reason = b.reason ? String(b.reason) : "Blocked";

    const start = DateTime.fromISO(String(b.start_time ?? "")).setZone("America/Toronto");
    const end = DateTime.fromISO(String(b.end_time ?? "")).setZone("America/Toronto");
    if (!start.isValid || !end.isValid) continue;

    const clippedStart = start < localDayStart ? localDayStart : start;
    const clippedEnd = end > localDayEnd ? localDayEnd : end;
    if (clippedEnd.toMillis() <= clippedStart.toMillis()) continue;

    const { timeSlot, durationMinutes } = toTimeSlotAndDuration(clippedStart, clippedEnd);
    const organizerName = `Blocked: ${reason}`;

    let affectedRoomIds: string[] = [];
    if (roomId) {
      affectedRoomIds = [roomId];
    } else if (building) {
      affectedRoomIds = roomsByBuilding.get(building) ?? [];
    }

    for (const rid of affectedRoomIds) {
      blockedBookings.push({
        roomId: rid,
        preferredDate: date,
        timeSlot,
        durationMinutes,
        organizerName,
        organizerEmail: "",
      });
    }
  }

  return NextResponse.json({ blockedBookings });
}

