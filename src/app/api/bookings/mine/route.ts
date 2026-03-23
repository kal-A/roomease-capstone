import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { getDemoMembershipsForEmail } from "@/lib/demoClubData";

type MembershipRow = { club_name: string; user_email: string; role_in_club: string };

type BookingRow = { booker_email?: string | null; club_name?: string | null };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const email = session.user.email.trim().toLowerCase();
  const role = session.user.role ?? getAppRoleFromEmail(session.user.email);

  if (role !== "member") {
    const { data, error } = await sb
      .from("bookings")
      .select("*")
      .eq("booker_email", session.user.email)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("SUPABASE QUERY ERROR (mine)", error);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? undefined,
          hint: error.details ?? undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: data ?? [] });
  }

  let memberships: MembershipRow[] = [];
  const memRes = await sb.from("club_memberships").select("club_name,user_email,role_in_club").eq("user_email", email);

  if (memRes.error) {
    console.warn("club_memberships query failed; using demo fallback", memRes.error.message);
    memberships = getDemoMembershipsForEmail(email) as MembershipRow[];
  } else {
    const rows = (memRes.data ?? []) as MembershipRow[];
    memberships = rows.length > 0 ? rows : getDemoMembershipsForEmail(email);
  }

  const memberClubs = memberships
    .filter((m) => String(m.user_email).toLowerCase() === email && String(m.role_in_club).toLowerCase() === "member")
    .map((m) => m.club_name);

  let execQuery =
    memRes.error || memberClubs.length === 0
      ? { data: [] as MembershipRow[] }
      : await sb
          .from("club_memberships")
          .select("club_name,user_email,role_in_club")
          .in("club_name", memberClubs)
          .eq("role_in_club", "executive");

  if (execQuery.data) {
    const extra = execQuery.data as MembershipRow[];
    const merged = [...memberships];
    for (const row of extra) {
      if (!merged.some((m) => m.club_name === row.club_name && m.user_email === row.user_email)) {
        merged.push(row);
      }
    }
    memberships = merged;
  }

  const execEmails = new Set<string>();
  for (const m of memberships) {
    if (String(m.role_in_club).toLowerCase() === "executive" && memberClubs.includes(m.club_name)) {
      execEmails.add(String(m.user_email).toLowerCase());
    }
  }

  const bookerEmails = [email, ...execEmails];
  const { data: raw, error } = await sb
    .from("bookings")
    .select("*")
    .in("booker_email", bookerEmails)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("SUPABASE QUERY ERROR (mine member)", error);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? undefined,
        hint: error.details ?? undefined,
      },
      { status: 500 }
    );
  }

  const rows = (raw ?? []) as BookingRow[];
  const filtered = rows.filter((row) => {
    const be = String(row.booker_email ?? "").toLowerCase();
    if (be === email) return true;
    const cn = String(row.club_name ?? "");
    return execEmails.has(be) && memberClubs.includes(cn);
  });

  return NextResponse.json({ bookings: filtered });
}
