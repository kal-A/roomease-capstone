import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";

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

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

type MembershipRow = { club_name: string; user_email: string; role_in_club: string };

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

  const requestedClub = clubName?.trim() ?? "";
  let club = requestedClub;
  let execEmail = targetExecutiveEmail?.trim().toLowerCase() || "";

  const memRes = await sb
    .from("club_memberships")
    .select("club_name, user_email, role_in_club")
    .eq("user_email", email)
    .eq("role_in_club", "member");
  if (memRes.error) {
    return NextResponse.json(
      {
        error:
          "Could not read club memberships. Ensure club_memberships is configured and includes this member.",
      },
      { status: 500 }
    );
  }
  const memberMemberships = (memRes.data ?? []) as MembershipRow[];

  if (!club) {
    if (memberMemberships.length === 1) {
      club = memberMemberships[0].club_name;
    } else if (memberMemberships.length > 1) {
      return NextResponse.json(
        { error: "Select a club before sending a recommendation (multiple club memberships found)." },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          error:
            "No member club memberships found. Join a club or provide a club + executive explicitly.",
        },
        { status: 400 }
      );
    }
  } else {
    const isMemberOfClub = memberMemberships.some((m) => m.club_name === club);
    if (!isMemberOfClub) {
      return NextResponse.json(
        { error: `You are not registered as a member of "${club}".` },
        { status: 403 }
      );
    }
  }

  if (!execEmail) {
    const { data: execs, error: execErr } = await sb
      .from("club_memberships")
      .select("user_email")
      .eq("club_name", club)
      .eq("role_in_club", "executive")
      .limit(1);
    if (execErr) {
      return NextResponse.json({ error: "Could not resolve an executive for this club." }, { status: 500 });
    }
    execEmail = String((execs?.[0] as { user_email?: string } | undefined)?.user_email ?? "").toLowerCase();
  }
  if (!execEmail) {
    return NextResponse.json(
      { error: `No executive found for "${club}".` },
      { status: 400 }
    );
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
