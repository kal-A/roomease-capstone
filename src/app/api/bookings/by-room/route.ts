import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLocalDayBoundsUtc } from "@/lib/bookingTime";
import { ROOMS } from "@/data/rooms";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const date = searchParams.get("date"); // yyyy-mm-dd

  if (!roomId || !date) {
    return NextResponse.json({ error: "Missing roomId or date" }, { status: 400 });
  }

  let dayStart: string;
  let dayEnd: string;
  try {
    const bounds = buildLocalDayBoundsUtc(date);
    dayStart = bounds.dayStartUtcIso;
    dayEnd = bounds.dayEndUtcIso;
  } catch {
    return NextResponse.json({ error: "Invalid date; expected YYYY-MM-DD" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("bookings")
    .select("room_id,start_time,end_time,booker_name,booker_email,event_name,organizer_name,status,review_state")
    .eq("room_id", roomId)
    // Overlap with the local-day window: start < dayEnd AND end > dayStart
    .lt("start_time", dayEnd)
    .gt("end_time", dayStart)
    // Denied bookings should not block.
    .in("status", ["pending", "approved", "confirmed", "changes_requested"])
    .order("start_time", { ascending: true });

  if (error) {
    console.error("SUPABASE QUERY ERROR (by-room)", error);
    return NextResponse.json(
      { error: error.message, code: error.code ?? undefined, hint: error.details ?? undefined },
      { status: 500 }
    );
  }

  const viewerEmail = session.user.email.toLowerCase();
  const maskEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "***@***";
    const head = local.slice(0, Math.min(3, local.length));
    return `${head}***@${domain}`;
  };

  const bookings = (data ?? []).map((b: any) => {
    const bookerEmail = String(b.booker_email ?? "");
    const isMine = bookerEmail.toLowerCase() === viewerEmail;
    const statusLower = String(b.status ?? "").toLowerCase().trim();
    const reviewStateLower = String(b.review_state ?? "").toLowerCase().trim();
    const statusOut =
      reviewStateLower === "changes_requested" && statusLower === "pending" ? "changes_requested" : statusLower;
    return {
      room_id: String(b.room_id),
      start_time: String(b.start_time),
      end_time: String(b.end_time),
      status: statusOut,
      organizer_name: String(b.organizer_name ?? ""),
      // Only expose event_name for the current user
      event_name: isMine ? String(b.event_name ?? "") : null,
      booker_name: isMine ? (b.booker_name ?? null) : (b.booker_name ?? null),
      booker_email: isMine ? bookerEmail : maskEmail(bookerEmail),
      is_mine: isMine,
    };
  });

  // Add active blockers for this room/day as "blocked" entries so the TimeBar shows them.
  const room = ROOMS.find((r) => String(r.id) === String(roomId));
  const building = room ? String(room.building ?? "") : "";

  const { data: blockerRows, error: blockerError } = await sb
    .from("room_blockers")
    .select("id,room_id,building,start_time,end_time,reason")
    .eq("is_active", true)
    .lt("start_time", dayEnd)
    .gt("end_time", dayStart);

  if (blockerError) {
    console.error("SUPABASE QUERY ERROR (blockers/by-room)", blockerError);
  }

  const blockedEmail = "blocked@blocked";
  const blockers =
    (blockerRows ?? [])
      .filter((br: any) => {
        const brRoom = br.room_id ? String(br.room_id) : "";
        const brBldg = br.building ? String(br.building) : "";
        return brRoom === String(roomId) || (!!building && brBldg === building);
      })
      .map((br: any) => {
        const reason = br.reason ? String(br.reason) : "Blocked";
        return {
          room_id: String(roomId),
          start_time: String(br.start_time),
          end_time: String(br.end_time),
          status: "blocked",
          organizer_name: `Blocked: ${reason}`,
          event_name: null,
          booker_name: null,
          booker_email: blockedEmail,
          is_mine: false,
        };
      });

  const merged = [...bookings, ...blockers].sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time)));

  return NextResponse.json({ bookings: merged });
}
