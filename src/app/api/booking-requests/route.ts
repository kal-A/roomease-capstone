import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { getDemoExecutiveForMemberEmail } from "@/lib/demoClubData";
import { DEMO_CLUB_NAME } from "@/lib/userRole";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.trim().toLowerCase();
  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);

  try {
    const sb = supabaseServer();
    if (role === "member") {
      const { data, error } = await sb
        .from("booking_requests")
        .select("*")
        .eq("created_by_email", email)
        .order("created_at", { ascending: false });
      if (error) {
        if (String(error.message).includes("does not exist") || error.code === "42P01") {
          return NextResponse.json({ requests: [] });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ requests: data ?? [] });
    }

    if (session.user.isAdmin) {
      const { data, error } = await sb.from("booking_requests").select("*").order("created_at", { ascending: false });
      if (error) {
        if (String(error.message).includes("does not exist") || error.code === "42P01") {
          return NextResponse.json({ requests: [] });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ requests: data ?? [] });
    }

    if (role === "executive") {
      const { data, error } = await sb
        .from("booking_requests")
        .select("*")
        .eq("target_executive_email", email)
        .order("created_at", { ascending: false });
      if (error) {
        if (String(error.message).includes("does not exist") || error.code === "42P01") {
          return NextResponse.json({ requests: [] });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ requests: data ?? [] });
    }

    return NextResponse.json({ requests: [] });
  } catch (e) {
    console.error("booking-requests GET", e);
    return NextResponse.json({ requests: [] });
  }
}

type CreateBody = {
  roomId: string;
  eventName: string;
  organizerName: string;
  groupSize: number;
  startTime: string;
  endTime: string;
  clubName?: string;
  targetExecutiveEmail?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);
  if (role !== "member") {
    return NextResponse.json({ error: "Only club members create recommendation requests." }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { roomId, eventName, organizerName, groupSize, startTime, endTime, clubName, targetExecutiveEmail } = body;
  if (!roomId || !eventName || !organizerName || !Number.isFinite(Number(groupSize)) || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const email = session.user.email.trim().toLowerCase();

  let sb;
  try {
    sb = supabaseServer();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let club = clubName?.trim() || DEMO_CLUB_NAME;
  let execEmail = targetExecutiveEmail?.trim().toLowerCase() || "";

  const { data: mems } = await sb.from("club_memberships").select("club_name, user_email, role_in_club").eq("user_email", email);

  if (mems && mems.length > 0) {
    const memberRow = (mems as { club_name: string; role_in_club: string }[]).find(
      (m) => String(m.role_in_club).toLowerCase() === "member"
    );
    if (memberRow) club = memberRow.club_name;
    const { data: execs } = await sb
      .from("club_memberships")
      .select("user_email")
      .eq("club_name", club)
      .eq("role_in_club", "executive")
      .limit(1);
    if (execs?.[0] && (execs[0] as { user_email: string }).user_email) {
      execEmail = String((execs[0] as { user_email: string }).user_email).toLowerCase();
    }
  }

  if (!execEmail) {
    execEmail = getDemoExecutiveForMemberEmail(email) ?? "";
  }
  if (!execEmail) {
    return NextResponse.json({ error: "Could not resolve a club executive for this request." }, { status: 400 });
  }

  const insert = {
    created_by_email: email,
    created_by_name: session.user.name ?? null,
    target_executive_email: execEmail,
    club_name: club,
    room_id: String(roomId),
    event_name: String(eventName),
    organizer_name: String(organizerName),
    group_size: Number(groupSize),
    start_time: String(startTime),
    end_time: String(endTime),
    status: "pending_exec_review",
    request_source: "member_recommendation",
  };

  const { data, error } = await sb.from("booking_requests").insert(insert).select().single();

  if (error) {
    console.error("booking_requests insert", error);
    if (String(error.message).includes("does not exist") || error.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Recommendation workflow is not enabled on this database yet. Apply supabase/migrations/20260313120000_role_workflow.sql.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
