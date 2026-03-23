import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";

type UndoBody = {
  bookingId: string;
};

function isRoomNotFoundError(err: any): boolean {
  if (!err) return false;
  const code = err.code ? String(err.code) : "";
  const msg = String(err.message ?? "");
  return code === "PGRST116" || /no rows/i.test(msg);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin) || (email ?? "").toLowerCase() === ADMIN_EMAIL;

  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: UndoBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = String(body?.bookingId ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });

  const sb = supabaseServer();

  // Fetch booking so we can determine the room approval policy.
  const { data: bookingRow, error: bookingErr } = await sb
    .from("bookings")
    .select("id, room_id, status, review_state, requested_changes_at, admin_note, reviewed_at, reviewed_by")
    .eq("id", bookingId)
    .single();

  if (bookingErr || !bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const roomId = String(bookingRow.room_id ?? "");
  if (!roomId) return NextResponse.json({ error: "Booking missing room_id" }, { status: 400 });

  // Determine whether the room requires approval (server-side truth).
  const { data: roomRow, error: roomErr } = await sb
    .from("rooms")
    .select("id, requires_approval")
    .eq("id", roomId)
    .single();

  let roomRequiresApproval: boolean;
  if (roomErr) {
    if (isRoomNotFoundError(roomErr)) {
      roomRequiresApproval = getRoomMetadataWithDefaults(roomId).approvalRequired === true;
    } else {
      return NextResponse.json({ error: "Failed to look up room approval requirements." }, { status: 500 });
    }
  } else {
    roomRequiresApproval = roomRow?.requires_approval === true;
  }

  const resolvedStatus = roomRequiresApproval ? "pending" : "confirmed";

  const payload: Record<string, unknown> = {
    status: resolvedStatus,
    review_state: null,
    requested_changes_at: null,
    admin_note: null,
    reviewed_at: null,
    reviewed_by: null,
  };

  const { error: updateErr } = await sb
    .from("bookings")
    .update(payload)
    .eq("id", bookingId);

  if (updateErr) {
    console.error("SUPABASE UNDO UPDATE ERROR", { bookingId, updateErr });
    return NextResponse.json({ error: "Failed to undo booking decision" }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: resolvedStatus });
}

