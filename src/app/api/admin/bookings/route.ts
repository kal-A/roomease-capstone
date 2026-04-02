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
  const isAdmin = Boolean(session?.user?.isAdmin) || (session?.user?.email ?? "").toLowerCase() === ADMIN_EMAIL;
  if (!session?.user?.email || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = supabaseServer();
  const roomsById = new Map(ROOMS.map((r) => [String(r.id), r]));

  let query = sb
    .from("bookings")
    .select(
      "id,room_id,start_time,end_time,booker_name,booker_email,event_name,organizer_name,group_size,status,created_at,admin_note,review_state,reviewed_at,reviewed_by,requested_changes_at,club_name,workflow_source,originated_by_email,originated_by_role,executive_email"
    )
    .order("start_time", { ascending: false })
    .limit(200);

  let { data, error } = await query;
  let bookingRowsRaw: unknown[] | null = data as unknown[] | null;

  if (error && /column|does not exist/i.test(String(error.message ?? ""))) {
    const fb = await sb
      .from("bookings")
      .select(
        "id,room_id,start_time,end_time,booker_name,booker_email,event_name,organizer_name,group_size,status,created_at,admin_note,review_state,reviewed_at,reviewed_by,requested_changes_at"
      )
      .order("start_time", { ascending: false })
      .limit(200);
    bookingRowsRaw = fb.data as unknown[] | null;
    error = fb.error;
  }

  if (error) {
    console.error("SUPABASE QUERY ERROR (admin bookings)", error);
    return NextResponse.json({ error: error.message, code: error.code ?? undefined }, { status: 500 });
  }

  type BookingRow = {
    id?: string | number | null;
    room_id?: string | number | null;
    start_time?: string | null;
    end_time?: string | null;
    booker_name?: string | null;
    booker_email?: string | null;
    event_name?: string | null;
    organizer_name?: string | null;
    group_size?: number | null;
    status?: string | null;
    created_at?: string | null;
    admin_note?: string | null;
    review_state?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    requested_changes_at?: string | null;
    club_name?: string | null;
    workflow_source?: string | null;
    originated_by_email?: string | null;
    originated_by_role?: string | null;
    executive_email?: string | null;
  };

  const bookingRows = (bookingRowsRaw ?? []) as BookingRow[];
  const BLOCKED_STATUSES = new Set(["pending", "approved", "confirmed", "changes_requested"]);

  function workflowForRow(b: BookingRow): { workflowTitle: string; workflowLines: string[] } {
    const wf = String(b.workflow_source ?? "").toLowerCase().trim();
    const orig = String(b.originated_by_email ?? "").trim();
    const origRole = String(b.originated_by_role ?? "").trim();
    const exec = String(b.executive_email ?? "").trim();
    const club = String(b.club_name ?? "").trim();
    const booker = String(b.booker_email ?? "").trim();

    if (wf === "member_recommendation" && orig) {
      const lines = [
        `Member recommendation from ${orig}${origRole ? ` (${origRole})` : ""}`,
        exec ? `Reviewed and booked by executive: ${exec}` : `Booked by: ${booker}`,
        club ? `Club context: ${club}` : "",
      ].filter(Boolean);
      return { workflowTitle: "Member → executive → admin (if required)", workflowLines: lines };
    }
    if (wf === "executive_direct") {
      const lines = [
        `Submitted directly by executive${exec ? `: ${exec}` : booker ? `: ${booker}` : ""}`,
        club ? `Club: ${club}` : "",
      ].filter(Boolean);
      return { workflowTitle: "Direct executive booking", workflowLines: lines.length ? lines : ["Executive-led booking flow."] };
    }
    return {
      workflowTitle: "Standard workflow",
      workflowLines: [`Booker: ${booker || "—"}`, club ? `Club: ${club}` : ""].filter(Boolean),
    };
  }

  const precomputed = bookingRows.map((r) => {
    const roomIdKey = String(r.room_id ?? "");
    const startMs = r.start_time ? DateTime.fromISO(String(r.start_time)).toMillis() : NaN;
    const endMs = r.end_time ? DateTime.fromISO(String(r.end_time)).toMillis() : NaN;
    const statusLower = String(r.status ?? "").toLowerCase().trim();
    return {
      id: String(r.id ?? ""),
      roomIdKey,
      startMs,
      endMs,
      statusLower,
    };
  });

  const bookings = bookingRows.map((b: BookingRow) => {
    const roomIdKey = String(b.room_id);
    const room = roomsById.get(roomIdKey);

    const start = DateTime.fromISO(String(b.start_time)).setZone("America/Toronto");
    const end = DateTime.fromISO(String(b.end_time)).setZone("America/Toronto");

    const date = start.isValid ? start.toFormat("yyyy-LL-dd") : "";
    const startTime = start.isValid ? start.toFormat("HH:mm") : "";
    const endTime = end.isValid ? end.toFormat("HH:mm") : "";
    const duration = start.isValid && end.isValid ? formatDurationLabel(start, end) : "—";

    const statusLower = String(b.status ?? "").toLowerCase().trim();
    const reviewStateLower = String(b.review_state ?? "").toLowerCase().trim();
    const statusForUi =
      reviewStateLower === "changes_requested" && statusLower === "pending" ? "changes_requested" : statusLower;
    const status = normalizeApiStatus(statusForUi as ApiStatus);
    const submittedAtIso = b.created_at ? String(b.created_at) : new Date().toISOString();

    // Compute a real conflict summary from the returned dataset.
    // (Denied bookings should not be considered blocking.)
    const bId = String(b.id ?? "");
    const bStartMs = b.start_time ? DateTime.fromISO(String(b.start_time)).toMillis() : NaN;
    const bEndMs = b.end_time ? DateTime.fromISO(String(b.end_time)).toMillis() : NaN;
    const conflictCount = precomputed.filter((o) => {
      if (!o.id || o.id === bId) return false;
      if (o.roomIdKey !== roomIdKey) return false;
      if (!BLOCKED_STATUSES.has(o.statusLower)) return false;
      if (!Number.isFinite(bStartMs) || !Number.isFinite(bEndMs)) return false;
      // overlap: start < otherEnd && end > otherStart
      return o.startMs < bEndMs && o.endMs > bStartMs;
    }).length;

    const wf = workflowForRow(b);

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
      notes: String(b.admin_note ?? ""),
      conflictSummary: conflictCount > 0 ? `Conflicts with ${conflictCount} booking(s).` : "No conflicts detected.",
      workflowTitle: wf.workflowTitle,
      workflowLines: wf.workflowLines,
    };
  });

  return NextResponse.json({ bookings });
}

