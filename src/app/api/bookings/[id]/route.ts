import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";

type PatchBookingBody = {
  roomId: string;
  eventName: string;
  organizerName: string;
  groupSize: number;
  startTime: string; // ISO
  endTime: string; // ISO
};

const BLOCKED_STATUSES = ["pending", "approved", "confirmed", "changes_requested"] as const;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);
  if (role === "member" && !session.user.isAdmin) {
    return NextResponse.json({ error: "Club members can’t delete bookings." }, { status: 403 });
  }

  const actingEmail = session.user.email.toLowerCase();
  const isAdmin = Boolean(session.user.isAdmin);
  const bookingId = (await ctx.params).id;

  let sb;
  try {
    sb = supabaseServer();
  } catch (e) {
    console.error("SUPABASE CLIENT ERROR", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: bookingRow, error: bookingError } = await sb
    .from("bookings")
    .select("id, booker_email")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const bookingEmail = String(bookingRow.booker_email ?? "").toLowerCase();
  const isOwner = bookingEmail === actingEmail;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await sb.from("bookings").delete().eq("id", bookingId);
  if (deleteError) {
    console.error("SUPABASE DELETE ERROR", { bookingId, deleteError });
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[booking-delete-dev]", {
      actionType: "delete",
      bookingId,
      sessionEmail: session.user.email,
      isAdmin,
      isOwner,
    });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);
  if (role === "member" && !session.user.isAdmin) {
    return NextResponse.json({ error: "Club members can’t edit bookings." }, { status: 403 });
  }

  const actingEmail = session.user.email.toLowerCase();
  const isAdmin = Boolean(session.user.isAdmin);
  const bookingId = (await ctx.params).id;

  let body: PatchBookingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomId, eventName, organizerName, groupSize, startTime, endTime } = body;
  if (!roomId || !eventName || !organizerName || !Number.isFinite(groupSize) || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return NextResponse.json({ error: "Invalid time range; end_time must be after start_time." }, { status: 400 });
  }

  let sb;
  try {
    sb = supabaseServer();
  } catch (e) {
    console.error("SUPABASE CLIENT ERROR", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Fetch existing booking for auth + overlap exclusion.
  const { data: bookingRow, error: bookingError } = await sb
    .from("bookings")
    .select("id, booker_email")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const bookingEmail = String(bookingRow.booker_email ?? "").toLowerCase();
  const isOwner = bookingEmail === actingEmail;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch room to decide status based on requires_approval.
  const { data: roomRow, error: roomError } = await sb
    .from("rooms")
    .select("id, requires_approval, building")
    .eq("id", String(roomId))
    .single();

  if (roomError) {
    console.error("ROOM LOOKUP ERROR", { roomError, roomId: String(roomId), bookingId });
    return NextResponse.json({ error: "Failed to look up room approval requirements." }, { status: 500 });
  }

  const roomRequiresApproval = roomRow?.requires_approval === true;
  const resolvedStatus = roomRequiresApproval ? (isAdmin ? "approved" : "pending") : "confirmed";
  const roomBuilding = roomRow?.building ? String(roomRow.building) : "";

  // Blockers / closures must prevent edits as well.
  const { data: blockerRows, error: blockerErr } = await sb
    .from("room_blockers")
    .select("id,room_id,building,reason")
    .eq("is_active", true)
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (blockerErr) {
    console.error("SUPABASE BLOCKER CHECK ERROR (patch)", { bookingId, blockerErr });
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

  const conflictCheck = await sb
    .from("bookings")
    .select("id")
    .eq("room_id", String(roomId))
    .in("status", [...BLOCKED_STATUSES])
    .neq("id", String(bookingId))
    // Overlap: start < newEnd AND end > newStart
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (process.env.NODE_ENV !== "production") {
    const conflictRows = Array.isArray(conflictCheck.data) ? conflictCheck.data : [];
    console.log("[booking-edit-dev]", {
      actionType: "patch",
      bookingId,
      sessionEmail: session.user.email ?? null,
      isAdmin,
      isOwner,
      roomId: String(roomId),
      resolvedStatus,
      conflictCount: conflictRows.length,
    });
  }

  if (conflictCheck.error) {
    console.error("SUPABASE CONFLICT CHECK ERROR", { bookingId, conflictError: conflictCheck.error });
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }

  if ((conflictCheck.data ?? []).length > 0) {
    return NextResponse.json({ error: "This room is already booked for that time." }, { status: 400 });
  }

  const payload = {
    room_id: String(roomId),
    event_name: String(eventName),
    organizer_name: String(organizerName),
    group_size: Number(groupSize),
    start_time: String(startTime),
    end_time: String(endTime),
    status: resolvedStatus,
    // Clear review metadata when a user edits/resubmits.
    review_state: null,
    requested_changes_at: null,
    admin_note: null,
    reviewed_at: null,
    reviewed_by: null,
  };

  const { data: updatedBooking, error: updateError } = await sb
    .from("bookings")
    .update(payload)
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    console.error("SUPABASE UPDATE ERROR", { bookingId, updateError, payload });
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }

  return NextResponse.json({ booking: updatedBooking });
}

