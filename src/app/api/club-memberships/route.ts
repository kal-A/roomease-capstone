import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

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
      console.warn("club-memberships GET", error.message);
      return NextResponse.json({ memberships: [] });
    }

    return NextResponse.json({ memberships: data ?? [] });
  } catch (e) {
    console.error("club-memberships GET", e);
    return NextResponse.json({ memberships: [] });
  }
}
