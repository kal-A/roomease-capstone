import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getDemoMembershipsForEmail } from "@/lib/demoClubData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.trim().toLowerCase();

  try {
    const sb = supabaseServer();
    const { data, error } = await sb.from("club_memberships").select("*").eq("user_email", email);

    if (error) {
      console.warn("club-memberships GET fallback", error.message);
      return NextResponse.json({ memberships: getDemoMembershipsForEmail(email) });
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ memberships: getDemoMembershipsForEmail(email) });
    }

    return NextResponse.json({ memberships: rows });
  } catch (e) {
    console.error("club-memberships GET", e);
    return NextResponse.json({ memberships: getDemoMembershipsForEmail(email) });
  }
}
