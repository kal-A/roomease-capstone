import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

/** Request body (camelCase) from client */
type CreateBookingBody = {
  roomId: string;
  eventName: string;
  organizerName: string;
  groupSize: number;
  startTime: string; // ISO
  endTime: string;   // ISO
};

/** Insert payload for bookings table (snake_case, matches DB columns) */
type BookingInsertPayload = {
  room_id: string;
  event_name: string;
  organizer_name: string;
  group_size: number;
  start_time: string;
  end_time: string;
  booker_email: string;
  booker_name: string | null;
   status: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBookingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    roomId,
    eventName,
    organizerName,
    groupSize,
    startTime,
    endTime,
  } = body;

  if (
    roomId == null ||
    eventName == null ||
    organizerName == null ||
    groupSize == null ||
    startTime == null ||
    endTime == null
  ) {
    return NextResponse.json(
      { error: "Missing required fields: roomId, eventName, organizerName, groupSize, startTime, endTime" },
      { status: 400 }
    );
  }

  const payload: BookingInsertPayload = {
    room_id: String(roomId),
    event_name: String(eventName),
    organizer_name: String(organizerName),
    group_size: Number(groupSize),
    start_time: String(startTime),
    end_time: String(endTime),
    booker_email: session.user.email,
    booker_name: session.user.name ?? null,
    status: "confirmed",
  };

  // Validate timestamps are ISO-parsable to avoid silent DB errors.
  const startMs = Date.parse(payload.start_time);
  const endMs = Date.parse(payload.end_time);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return NextResponse.json(
      { error: "Invalid start_time/end_time; must be ISO timestamps." },
      { status: 400 }
    );
  }
  if (endMs <= startMs) {
    return NextResponse.json(
      { error: "Invalid time range; end_time must be after start_time." },
      { status: 400 }
    );
  }

  const isAdmin = session.user.email?.toLowerCase() === "fvalli@uwaterloo.ca";

  let sb;
  try {
    sb = supabaseServer();
  } catch (e) {
    console.error("SUPABASE CLIENT ERROR", e);
    return NextResponse.json(
      { error: "Server configuration error", code: "SUPABASE_CLIENT" },
      { status: 500 }
    );
  }

  // Fetch the room from Supabase so we can read room.requires_approval.
  const { data: roomRow, error: roomError } = await sb
    .from("rooms")
    .select("id, requires_approval, building")
    .eq("id", String(roomId))
    .single();

  if (roomError) {
    const isNotFound = roomError.code === "PGRST116" || /no rows/i.test(String(roomError.message ?? ""));
    if (isNotFound) {
      return NextResponse.json(
        { error: "This room is not yet configured in the booking system." },
        { status: 400 }
      );
    }
    console.error("ROOM LOOKUP ERROR", { roomError, roomId: String(roomId), isAdmin });
    return NextResponse.json({ error: "Failed to look up room approval requirements." }, { status: 500 });
  }

  const roomRequiresApproval = roomRow?.requires_approval === true;
  const resolvedStatus = roomRequiresApproval ? (isAdmin ? "approved" : "pending") : "confirmed";
  const roomBuilding = roomRow?.building ? String(roomRow.building) : "";

  console.log("BOOKING CREATE DEV", {
    sessionEmail: session.user.email ?? null,
    isAdmin,
    roomId: String(roomId),
    roomRequiresApproval,
    resolvedStatus,
  });

  payload.status = resolvedStatus;

  // Room blockers / closures must prevent booking regardless of status.
  const { data: blockerRows, error: blockerErr } = await sb
    .from("room_blockers")
    .select("id,room_id,building,reason")
    .eq("is_active", true)
    .lt("start_time", String(endTime))
    .gt("end_time", String(startTime));

  if (blockerErr) {
    console.error("SUPABASE BLOCKER CHECK ERROR (create)", blockerErr);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }

  const hasMatchingBlocker = (blockerRows ?? []).some((br: any) => {
    const brRoom = br.room_id ? String(br.room_id) : "";
    const brBuilding = br.building ? String(br.building) : "";
    return brRoom === String(roomId) || (!!roomBuilding && brBuilding === roomBuilding);
  });

  if (hasMatchingBlocker) {
    return NextResponse.json({ error: "This room is unavailable due to a blocker or closure." }, { status: 400 });
  }

  // Manual overlap check: rely on DB exclusion constraint for most cases,
  // but also ensure `changes_requested` blocks availability consistently.
  const BLOCKED_STATUSES = ["pending", "approved", "confirmed", "changes_requested"] as const;
  const { data: conflictCheck, error: conflictErr } = await sb
    .from("bookings")
    .select("id")
    .eq("room_id", String(roomId))
    .in("status", [...BLOCKED_STATUSES])
    .lt("start_time", String(endTime))
    .gt("end_time", String(startTime));

  if (conflictErr) {
    console.error("SUPABASE CONFLICT CHECK ERROR (create)", { roomId, conflictErr });
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }

  if ((conflictCheck ?? []).length > 0) {
    return NextResponse.json({ error: "This room is already booked for that time." }, { status: 400 });
  }

  const { data, error } = await sb
    .from("bookings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("SUPABASE INSERT ERROR", { error, payload });

    // Handle exclusion constraint conflicts (e.g. bookings_no_overlap).
    const code = (error as any)?.code;
    const message = String((error as any)?.message ?? "");
    if (code === "23P01" && message.toLowerCase().includes("bookings_no_overlap")) {
      return NextResponse.json(
        { error: "This room is already booked for that time." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? undefined,
        hint: error.details ?? undefined,
      },
      { status: 500 }
    );
  }

  console.log("Inserted booking", { id: data?.id, payload });
  return NextResponse.json({ booking: data });
}
