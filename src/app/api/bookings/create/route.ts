import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { insertBookingCore, type BookingProvenance } from "@/lib/server/insertBookingCore";

/** Request body (camelCase) from client */
type CreateBookingBody = {
  roomId: string;
  eventName: string;
  organizerName: string;
  groupSize: number;
  startTime: string; // ISO
  endTime: string; // ISO
  /** Optional workflow metadata (executive direct bookings) */
  clubName?: string;
  workflowSource?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);
  if (role === "member") {
    return NextResponse.json(
      {
        error:
          "Club members can’t book rooms directly. Use Recommend to executive from the booking flow to send a request.",
      },
      { status: 403 }
    );
  }

  let body: CreateBookingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomId, eventName, organizerName, groupSize, startTime, endTime, clubName, workflowSource } = body;

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

  let sb;
  try {
    sb = supabaseServer();
  } catch (e) {
    console.error("SUPABASE CLIENT ERROR", e);
    return NextResponse.json({ error: "Server configuration error", code: "SUPABASE_CLIENT" }, { status: 500 });
  }

  let resolvedClub = clubName?.trim() ?? null;
  if (!resolvedClub && role === "executive") {
    const { data: m } = await sb
      .from("club_memberships")
      .select("club_name")
      .eq("user_email", session.user.email.toLowerCase())
      .eq("role_in_club", "executive")
      .limit(1);
    resolvedClub = (m?.[0] as { club_name?: string } | undefined)?.club_name?.trim() ?? null;
  }

  const provenance: BookingProvenance | undefined =
    resolvedClub || workflowSource || role === "executive"
      ? {
          club_name: resolvedClub,
          workflow_source: workflowSource?.trim() || (role === "executive" ? "executive_direct" : null),
          originated_by_email: session.user.email,
          originated_by_role: role,
          executive_email: session.user.email,
        }
      : undefined;

  const result = await insertBookingCore(sb, {
    bookerEmail: session.user.email,
    bookerName: session.user.name ?? null,
    roomId: String(roomId),
    eventName: String(eventName),
    organizerName: String(organizerName),
    groupSize: Number(groupSize),
    startTime: String(startTime),
    endTime: String(endTime),
    isAdminUser: Boolean(session.user.isAdmin),
    provenance,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, hint: result.hint },
      { status: result.status }
    );
  }

  console.log("Inserted booking", { id: result.booking?.id });
  return NextResponse.json({ booking: result.booking });
}
