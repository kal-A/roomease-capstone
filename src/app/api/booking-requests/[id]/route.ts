import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { insertBookingCore } from "@/lib/server/insertBookingCore";

type PatchBody = {
  action: "approve" | "deny";
  note?: string;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);
  if (role !== "executive") {
    return NextResponse.json({ error: "Only club executives can review requests." }, { status: 403 });
  }

  const id = (await ctx.params).id;
  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "deny") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  let sb;
  try {
    sb = supabaseServer();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const execEmail = session.user.email.trim().toLowerCase();

  const { data: row, error: fetchErr } = await sb.from("booking_requests").select("*").eq("id", id).single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const target = String((row as { target_executive_email?: string }).target_executive_email ?? "").toLowerCase();
  if (target !== execEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bookerEmail = session.user.email.trim().toLowerCase();
  const bookerName = session.user.name ?? null;

  const statusNow = String((row as { status?: string }).status ?? "");
  if (statusNow !== "pending_exec_review") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 400 });
  }

  if (body.action === "deny") {
    const { data: updated, error: upErr } = await sb
      .from("booking_requests")
      .update({
        status: "denied_by_exec",
        executive_note: body.note?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by_email: session.user.email,
      })
      .eq("id", id)
      .select()
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ request: updated });
  }

  // Approve → create booking as executive
  const r = row as {
    room_id: string;
    event_name: string;
    organizer_name: string;
    group_size: number;
    start_time: string;
    end_time: string;
    created_by_email: string;
    club_name: string;
  };

  const result = await insertBookingCore(sb, {
    bookerEmail,
    bookerName,
    roomId: String(r.room_id),
    eventName: String(r.event_name ?? ""),
    organizerName: String(r.organizer_name ?? ""),
    groupSize: Number(r.group_size ?? 0),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    // Always apply executive approval rules so admin-required rooms still enter the admin queue.
    isAdminUser: false,
    provenance: {
      club_name: r.club_name,
      workflow_source: "member_recommendation",
      originated_by_email: r.created_by_email,
      originated_by_role: "member",
      executive_email: bookerEmail,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  const booking = result.booking as { id?: string; status?: string };
  const bookingStatus = String(booking.status ?? "").toLowerCase();
  const nextRequestStatus = bookingStatus === "pending" ? "submitted_for_admin" : "completed";

  const { data: updated, error: upErr } = await sb
    .from("booking_requests")
    .update({
      status: nextRequestStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: session.user.email,
      booking_id: booking.id ?? null,
      executive_note: body.note?.trim() || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message, booking }, { status: 500 });
  }

  return NextResponse.json({ request: updated, booking });
}
