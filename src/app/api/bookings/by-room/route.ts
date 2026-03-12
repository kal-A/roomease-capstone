import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const date = searchParams.get("date"); // yyyy-mm-dd

  if (!roomId || !date) {
    return NextResponse.json({ error: "Missing roomId or date" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59.999Z`).toISOString();

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("bookings")
    .select("room_id,start_time,end_time,booker_name,booker_email,event_name")
    .eq("room_id", roomId)
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("SUPABASE QUERY ERROR (by-room)", error);
    return NextResponse.json(
      { error: error.message, code: error.code ?? undefined, hint: error.details ?? undefined },
      { status: 500 }
    );
  }
  return NextResponse.json({ bookings: data ?? [] });
}
