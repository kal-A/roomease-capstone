import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

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
