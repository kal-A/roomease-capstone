import type { SupabaseClient } from "@supabase/supabase-js";

const BLOCKED_STATUSES = ["pending", "approved", "confirmed", "changes_requested"] as const;

export type BookingProvenance = {
  club_name?: string | null;
  workflow_source?: string | null;
  originated_by_email?: string | null;
  originated_by_role?: string | null;
  executive_email?: string | null;
};

export type InsertBookingCoreParams = {
  bookerEmail: string;
  bookerName: string | null;
  roomId: string;
  eventName: string;
  organizerName: string;
  groupSize: number;
  startTime: string;
  endTime: string;
  /** True when the booker is a global admin (can auto-approve approval-required rooms). */
  isAdminUser: boolean;
  provenance?: BookingProvenance;
};

export type InsertBookingCoreResult =
  | { ok: true; booking: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string; hint?: string };

/**
 * Shared server-side booking creation (validation, blockers, conflicts, insert).
 */
export async function insertBookingCore(
  sb: SupabaseClient,
  params: InsertBookingCoreParams
): Promise<InsertBookingCoreResult> {
  const {
    bookerEmail,
    bookerName,
    roomId,
    eventName,
    organizerName,
    groupSize,
    startTime,
    endTime,
    isAdminUser,
    provenance,
  } = params;

  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { ok: false, status: 400, error: "Invalid start_time/end_time; must be ISO timestamps." };
  }
  if (endMs <= startMs) {
    return { ok: false, status: 400, error: "Invalid time range; end_time must be after start_time." };
  }

  const { data: roomRow, error: roomError } = await sb
    .from("rooms")
    .select("id, requires_approval, building")
    .eq("id", String(roomId))
    .single();

  if (roomError) {
    const isNotFound = roomError.code === "PGRST116" || /no rows/i.test(String(roomError.message ?? ""));
    if (isNotFound) {
      return { ok: false, status: 400, error: "This room is not yet configured in the booking system." };
    }
    console.error("ROOM LOOKUP ERROR (insertBookingCore)", { roomError, roomId });
    return { ok: false, status: 500, error: "Failed to look up room approval requirements." };
  }

  const roomRequiresApproval = roomRow?.requires_approval === true;
  const resolvedStatus = roomRequiresApproval ? (isAdminUser ? "approved" : "pending") : "confirmed";
  const roomBuilding = roomRow?.building ? String(roomRow.building) : "";

  const basePayload: Record<string, unknown> = {
    room_id: String(roomId),
    event_name: String(eventName),
    organizer_name: String(organizerName),
    group_size: Number(groupSize),
    start_time: String(startTime),
    end_time: String(endTime),
    booker_email: bookerEmail,
    booker_name: bookerName,
    status: resolvedStatus,
  };

  if (provenance) {
    const { club_name, workflow_source, originated_by_email, originated_by_role, executive_email } = provenance;
    if (club_name != null) basePayload.club_name = club_name;
    if (workflow_source != null) basePayload.workflow_source = workflow_source;
    if (originated_by_email != null) basePayload.originated_by_email = originated_by_email;
    if (originated_by_role != null) basePayload.originated_by_role = originated_by_role;
    if (executive_email != null) basePayload.executive_email = executive_email;
  }

  const stripWorkflowFields = (p: Record<string, unknown>) => {
    const out = { ...p };
    delete out.club_name;
    delete out.workflow_source;
    delete out.originated_by_email;
    delete out.originated_by_role;
    delete out.executive_email;
    return out;
  };

  const { data: blockerRows, error: blockerErr } = await sb
    .from("room_blockers")
    .select("id,room_id,building,reason")
    .eq("is_active", true)
    .lt("start_time", String(endTime))
    .gt("end_time", String(startTime));

  if (blockerErr) {
    console.error("SUPABASE BLOCKER CHECK ERROR (insertBookingCore)", blockerErr);
    return { ok: false, status: 500, error: "Unexpected server error" };
  }

  const hasMatchingBlocker = (blockerRows ?? []).some((br: { room_id?: unknown; building?: unknown }) => {
    const brRoom = br.room_id ? String(br.room_id) : "";
    const brBuilding = br.building ? String(br.building) : "";
    return brRoom === String(roomId) || (!!roomBuilding && brBuilding === roomBuilding);
  });

  if (hasMatchingBlocker) {
    return { ok: false, status: 400, error: "This room is unavailable due to a blocker or closure." };
  }

  const { data: conflictCheck, error: conflictErr } = await sb
    .from("bookings")
    .select("id")
    .eq("room_id", String(roomId))
    .in("status", [...BLOCKED_STATUSES])
    .lt("start_time", String(endTime))
    .gt("end_time", String(startTime));

  if (conflictErr) {
    console.error("SUPABASE CONFLICT CHECK ERROR (insertBookingCore)", { roomId, conflictErr });
    return { ok: false, status: 500, error: "Unexpected server error" };
  }

  if ((conflictCheck ?? []).length > 0) {
    return { ok: false, status: 400, error: "This room is already booked for that time." };
  }

  let insertPayload: Record<string, unknown> = basePayload;
  let { data, error } = await sb.from("bookings").insert(insertPayload).select().single();

  if (error) {
    const message = String((error as { message?: string }).message ?? "");
    const missingCol =
      message.toLowerCase().includes("column") && message.toLowerCase().includes("does not exist");
    if (missingCol && provenance) {
      insertPayload = stripWorkflowFields(basePayload);
      const second = await sb.from("bookings").insert(insertPayload).select().single();
      data = second.data;
      error = second.error;
    }
  }

  if (error) {
    console.error("SUPABASE INSERT ERROR (insertBookingCore)", { error, insertPayload });
    const code = (error as { code?: string }).code;
    const message = String((error as { message?: string }).message ?? "");
    if (code === "23P01" && message.toLowerCase().includes("bookings_no_overlap")) {
      return { ok: false, status: 400, error: "This room is already booked for that time." };
    }
    return {
      ok: false,
      status: 500,
      error: error.message,
      code: error.code,
      hint: error.details ?? undefined,
    };
  }

  return { ok: true, booking: data as Record<string, unknown> };
}
