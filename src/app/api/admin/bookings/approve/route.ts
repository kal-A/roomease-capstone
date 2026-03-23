import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

type ApproveBody = {
  bookingId: string;
  adminNote?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin) || (email ?? "").toLowerCase() === ADMIN_EMAIL;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ApproveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = String(body?.bookingId ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  let sb;
  try {
    sb = supabaseServer();
  } catch (e) {
    console.error("SUPABASE CLIENT ERROR", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Demo: keep mutations minimal to avoid schema mismatches.
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status: "approved",
    reviewed_at: nowIso,
    reviewed_by: email,
    review_state: null,
    requested_changes_at: null,
  };
  if (body?.adminNote && String(body.adminNote).trim()) {
    payload.admin_note = String(body.adminNote).trim();
  }

  const { data, error } = await sb
    .from("bookings")
    .update(payload)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    console.error("SUPABASE APPROVE UPDATE ERROR", { bookingId, error });
    return NextResponse.json({ error: "Failed to approve booking" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[admin-approve-dev]", { actionType: "approve", bookingId, sessionEmail: email });
  }

  return NextResponse.json({ success: true });
}

