import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { DateTime } from "luxon";

type AdminBlocker = {
  id: string;
  roomId: string | null;
  building: string | null;
  date: string; // yyyy-mm-dd (local)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string | null;
  createdBy?: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin) || (email ?? "").toLowerCase() === ADMIN_EMAIL;
  if (!email || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("room_blockers")
    .select("id,room_id,building,start_time,end_time,reason,created_by,is_active")
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code ?? undefined }, { status: 500 });
  }

  const blockers: AdminBlocker[] = (data ?? []).map((b: any) => {
    const start = DateTime.fromISO(String(b.start_time ?? "")).setZone("America/Toronto");
    const end = DateTime.fromISO(String(b.end_time ?? "")).setZone("America/Toronto");
    return {
      id: String(b.id),
      roomId: b.room_id ? String(b.room_id) : null,
      building: b.building ? String(b.building) : null,
      date: start.isValid ? start.toFormat("yyyy-LL-dd") : "",
      startTime: start.isValid ? start.toFormat("HH:mm") : "",
      endTime: end.isValid ? end.toFormat("HH:mm") : "",
      reason: b.reason ? String(b.reason) : null,
      createdBy: b.created_by ? String(b.created_by) : null,
    };
  });

  return NextResponse.json({ blockers });
}

