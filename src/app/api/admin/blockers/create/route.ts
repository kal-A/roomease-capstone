import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { DateTime } from "luxon";

type CreateBlockerBody = {
  roomId?: string;
  building?: string;
  date: string; // yyyy-mm-dd
  startTime?: string; // HH:mm (24h)
  endTime?: string; // HH:mm (24h)
  reason?: string;
};

function parseHm(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hm ?? "").trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin) || (email ?? "").toLowerCase() === ADMIN_EMAIL;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateBlockerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomId, building, date, reason } = body;
  const startTime = body.startTime ?? "09:00";
  const endTime = body.endTime ?? "22:00";

  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const hmStart = parseHm(startTime);
  const hmEnd = parseHm(endTime);
  if (!hmStart || !hmEnd) {
    return NextResponse.json({ error: "Invalid startTime/endTime; expected HH:mm" }, { status: 400 });
  }

  // Validate date shape using luxon.
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date).trim());
  if (!dateMatch) return NextResponse.json({ error: "Invalid date; expected YYYY-MM-DD" }, { status: 400 });
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const startLocal = DateTime.fromObject({ year, month, day, hour: hmStart.hour, minute: hmStart.minute, second: 0, millisecond: 0 }, { zone: "America/Toronto" });
  const endLocal = DateTime.fromObject({ year, month, day, hour: hmEnd.hour, minute: hmEnd.minute, second: 0, millisecond: 0 }, { zone: "America/Toronto" });
  if (!startLocal.isValid || !endLocal.isValid || !endLocal.toMillis || endLocal.toMillis <= startLocal.toMillis) {
    return NextResponse.json({ error: "Invalid blocker time range" }, { status: 400 });
  }

  const startIso = startLocal.toUTC().toISO();
  const endIso = endLocal.toUTC().toISO();
  if (!startIso || !endIso) return NextResponse.json({ error: "Invalid time conversion" }, { status: 400 });

  if (!roomId && !building) {
    return NextResponse.json({ error: "Must provide either roomId or building" }, { status: 400 });
  }

  const sb = supabaseServer();

  // Note: we keep blocker creation minimal and rely on the UI + admin review.
  const { data, error } = await sb
    .from("room_blockers")
    .insert({
      room_id: roomId ? String(roomId) : null,
      building: building ? String(building) : null,
      start_time: startIso,
      end_time: endIso,
      reason: reason ? String(reason) : "Blocked by admin",
      created_by: String(email),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Failed to create blocker: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, blocker: data });
}

