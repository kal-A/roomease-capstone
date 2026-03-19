import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { ROOMS } from "@/data/rooms";
import { getBuildingDisplayName } from "@/lib/buildings";
import { DateTime } from "luxon";

type ApiStatus = "pending" | "approved" | "denied" | "confirmed" | "changes_requested";

function normalizeApiStatus(
  raw: string
): "Pending" | "Approved" | "Denied" | "Confirmed" | "Changes Requested" {
  const v = String(raw ?? "").toLowerCase().trim();
  if (v === "pending") return "Pending";
  if (v === "approved") return "Approved";
  if (v === "denied") return "Denied";
  if (v === "confirmed") return "Confirmed";
  if (v === "changes_requested") return "Changes Requested";
  return "Pending";
}

function formatDurationLabel(start: DateTime, end: DateTime): string {
  const minutes = Math.max(0, Math.round(end.diff(start, "minutes").minutes));
  const hours = minutes / 60;
  if (!Number.isFinite(hours) || hours <= 0) return "—";

  const roundedToHalf = Math.round(hours * 2) / 2;
  const isOne = roundedToHalf === 1;
  const isHalf = roundedToHalf === 1.5 || roundedToHalf === 0.5;
  const val = roundedToHalf % 1 === 0 ? `${Math.round(roundedToHalf)}` : `${roundedToHalf}`;
  if (isOne) return "1 hour";
  if (val.includes(".5") && !isHalf) return `${val} hours`;
  if (val.includes(".5")) return `${val} hours`;
  return `${val} hours`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user?.email ?? "").toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = supabaseServer();
  const roomsById = new Map(ROOMS.map((r) => [String(r.id), r]));

  // Pull recent bookings so the admin approvals UI can reflect real status.
  const { data, error } = await sb
    .from("bookings")
    .select("id,room_id,start_time,end_time,booker_name,booker_email,event_name,organizer_name,group_size,status,created_at")
    .order("start_time", { ascending: false })
    .limit(200);

  if (error) {
    console.error("SUPABASE QUERY ERROR (admin bookings)", error);
    return NextResponse.json({ error: error.message, code: error.code ?? undefined }, { status: 500 });
  }

  const bookings = (data ?? []).map((b: any) => {
    const roomIdKey = String(b.room_id);
    const room = roomsById.get(roomIdKey);
    const start = DateTime.fromISO(String(b.start_time)).setZone("America/Toronto");
    const end = DateTime.fromISO(String(b.end_time)).setZone("America/Toronto");

    const date = start.isValid ? start.toFormat("yyyy-LL-dd") : "";
    const startTime = start.isValid ? start.toFormat("HH:mm") : "";
    const endTime = end.isValid ? end.toFormat("HH:mm") : "";
    const duration = start.isValid && end.isValid ? formatDurationLabel(start, end) : "—";

    const status = normalizeApiStatus(String(b.status ?? "") as ApiStatus);
    const submittedAtIso = b.created_at ? String(b.created_at) : new Date().toISOString();

    return {
      id: String(b.id ?? `${b.event_name}-${roomIdKey}-${submittedAtIso}`),
      status,
      roomId: room?.name ?? roomIdKey,
      buildingCode: String(room?.building ?? ""),
      buildingName: getBuildingDisplayName(String(room?.building ?? "")),
      date,
      startTime,
      endTime,
      duration,
      groupSize: Number(b.group_size ?? 0),
      eventName: String(b.event_name ?? ""),
      organizerName: String(b.organizer_name ?? ""),
      organizerEmail: String(b.booker_email ?? ""),
      furnitureNeeds: "—",
      avNeeds: "—",
      submittedAt: submittedAtIso,
      notes: "",
      conflictSummary: "",
    };
  });

  return NextResponse.json({ bookings });
}

