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
